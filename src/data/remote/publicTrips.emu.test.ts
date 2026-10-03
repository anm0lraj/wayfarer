import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, setDoc, type Firestore } from 'firebase/firestore'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setActorId } from '../actor'
import { db } from '../db'

const current = vi.hoisted(() => ({ db: undefined as unknown }))
vi.mock('@/services/firebase/firestore', () => ({ getDb: () => current.db }))
vi.mock('@/config/env', () => ({ env: { backend: 'firebase', isProduction: false, appEnv: 'development' } }))

import { likeRepo, memoryRepo, publicTripRepo, savedRepo, tripRepo } from '../repositories'
import { syncNow } from '../syncEngine'
import { getPublicTrip, getPublicTripBySlug, getPublicTrips, listPublicDestinationIds, listPublicPage } from './publicTrips'
import { sendBatchToFirestore } from './firestoreSync'
import { firestoreMediaService } from '@/services/storage/firestoreMedia'
import type { PublicTrip } from '@/types'
import { GET as previewPage } from '../../../api/og'
import { GET as previewImage } from '../../../api/og-image'

type Who = 'owner' | 'amy' | 'nobody'
const people = {} as Record<Who, { uid: string; fs: Firestore }>

async function signUp(name: 'owner' | 'amy'): Promise<{ uid: string; fs: Firestore }> {
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x' }, `pt-${name}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, `pt.${name}@example.com`, 'password-123')
  const fs = initializeFirestore(app, { ignoreUndefinedProperties: true })
  connectFirestoreEmulator(fs, '127.0.0.1', 8080)
  return { uid: cred.user.uid, fs }
}

/** Someone who is not signed in. */
function visitor(): { uid: string; fs: Firestore } {
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer' }, 'pt-visitor')
  const fs = initializeFirestore(app, { ignoreUndefinedProperties: true })
  connectFirestoreEmulator(fs, '127.0.0.1', 8080)
  return { uid: '', fs }
}

/** A fresh device for this person: their Firestore session, their actor id, an empty local database. */
async function onDevice(who: Who) {
  current.db = people[who].fs
  setActorId(who === 'nobody' ? null : people[who].uid)
  await Promise.all(db.tables.map((t) => t.clear()))
}
const sync = () => syncNow(sendBatchToFirestore)
const pub = async (id: string) => (await getDoc(doc(people.owner.fs, 'publicTrips', id))).data()

beforeAll(async () => {
  people.owner = await signUp('owner')
  people.amy = await signUp('amy')
  people.nobody = visitor()
})

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
})

const jpeg = () => new Blob([new Uint8Array(40).fill(9)], { type: 'image/jpeg' })

/** The owner has a trip with one uploaded photo, published as `visibility`. Returns the page. */
async function ownerPublishes(visibility: 'public' | 'link' = 'public'): Promise<PublicTrip> {
  await onDevice('owner')
  const trip = await tripRepo.create({ title: 'Bali Escape', destinationIds: ['bali'], startDate: '2026-12-01', endDate: '2026-12-03', timezone: 'Asia/Makassar', travellers: { group: 'solo', count: 1 }, budget: { tier: 'comfort', total: { amount: 50000, currency: 'INR' } }, interests: [], planningStyle: 'manual' })
  const { key } = await firestoreMediaService.upload(jpeg(), { path: `trips/${trip.id}/memories` })
  await memoryRepo.add({ tripId: trip.id, kind: 'photo', caption: 'Sunrise', mediaKey: key, capturedAt: '2026-12-01T06:00:00.000Z', uploadState: 'done', stripLocationOnPublic: true })
  const page = await publicTripRepo.publish(trip.id, { description: 'A relaxed few days by the sea.', visibility })
  await sync()
  expect(await db.syncQueue.count()).toBe(0)
  return page
}

describe('publishing', () => {
  it('stores the page, its short link and its photos, readable by someone who is not signed in', async () => {
    const page = await ownerPublishes()
    expect(page.snapshot.memories[0]!.mediaUrl).toBe(`public/${page.id}/${page.snapshot.memories[0]!.id}`)
    expect(await pub(page.id)).toMatchObject({ title: 'Bali Escape', visibility: 'public', likeCount: 0, saveCount: 0 })

    current.db = people.nobody.fs
    expect((await getPublicTripBySlug(page.slug))?.id).toBe(page.id)
    expect((await getPublicTrip(page.id))?.title).toBe('Bali Escape')
    const photo = await firestoreMediaService.getUrl(page.snapshot.memories[0]!.mediaUrl)
    expect(photo?.startsWith('blob:')).toBe(true)
  })

  it('an unlisted page opens by its link but never appears in the feed', async () => {
    const page = await ownerPublishes('link')
    current.db = people.nobody.fs
    expect((await getPublicTripBySlug(page.slug))?.id).toBe(page.id)
    expect((await listPublicPage(null, 10)).items).toHaveLength(0)
  })

  it('a wrong link finds nothing', async () => {
    await ownerPublishes()
    current.db = people.nobody.fs
    expect(await getPublicTripBySlug('no-such-page-0000')).toBeUndefined()
  })

  it('unpublishing removes the page, its photos and its link for everyone', async () => {
    const page = await ownerPublishes()
    const photoId = page.snapshot.memories[0]!.id
    await publicTripRepo.unpublish(page.tripId!)
    await sync()
    expect(await pub(page.id)).toBeUndefined()
    expect((await getDoc(doc(people.owner.fs, 'publicSlugs', page.slug))).exists()).toBe(false)
    const r = await fetch(`http://127.0.0.1:8080/v1/projects/demo-wayfarer/databases/(default)/documents/publicTrips/${page.id}/media/${photoId}`, { headers: { Authorization: 'Bearer owner' } })
    expect(r.status).toBe(404)
  })
})

describe('likes and saves', () => {
  async function amyOpens(page: PublicTrip) {
    await onDevice('amy')
    await db.publicTrips.put(page) // as it would be after she opened the page
  }

  it('liking and saving raise the counters once; undoing lowers them again', async () => {
    const page = await ownerPublishes()
    await amyOpens(page)

    expect(await likeRepo.toggle(page.id)).toBe(true)
    await savedRepo.save(page.id)
    await sync()
    expect(await pub(page.id)).toMatchObject({ likeCount: 1, saveCount: 1 })

    await sync() // nothing left to send; running again changes nothing
    expect(await pub(page.id)).toMatchObject({ likeCount: 1, saveCount: 1 })

    expect(await likeRepo.toggle(page.id)).toBe(false)
    await savedRepo.unsave(page.id)
    await sync()
    expect(await pub(page.id)).toMatchObject({ likeCount: 0, saveCount: 0 })
  })

  it('two people liking add up', async () => {
    const page = await ownerPublishes()
    await amyOpens(page)
    await likeRepo.toggle(page.id)
    await sync()

    await onDevice('owner')
    await db.publicTrips.put({ ...page, likeCount: 1 })
    await likeRepo.toggle(page.id)
    await sync()
    expect((await pub(page.id))?.likeCount).toBe(2)
  })

  it('republishing keeps the likes and saves other people have given', async () => {
    const page = await ownerPublishes()
    await amyOpens(page)
    await likeRepo.toggle(page.id)
    await sync()

    await onDevice('owner')
    const trip = await tripRepo.create({ title: 'Bali Escape', destinationIds: ['bali'], startDate: '2026-12-01', endDate: '2026-12-03', timezone: 'Asia/Makassar', travellers: { group: 'solo', count: 1 }, budget: { tier: 'comfort' }, interests: [], planningStyle: 'manual' })
    await publicTripRepo.publish(trip.id, { description: 'First version of the page.', visibility: 'public' })
    await publicTripRepo.publish(trip.id, { description: 'Second version of the page.', visibility: 'public' })
    await sync()
    const second = (await db.publicTrips.toArray()).find((p) => p.tripId === trip.id)!
    expect((await pub(second.id))?.description).toBe('Second version of the page.')
    expect((await pub(page.id))?.likeCount).toBe(1) // the first page is untouched
  })

  it('a like on a page that has since been unpublished is dropped quietly', async () => {
    const page = await ownerPublishes()
    await amyOpens(page)
    await likeRepo.toggle(page.id)
    await fetch(`http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents/publicTrips`, { method: 'DELETE' })
    const result = await sync()
    expect(result.failed).toBe(false)
    expect(await db.syncQueue.count()).toBe(0)
  })
})

describe('the Explore feed', () => {
  const entry = (n: number, over: Record<string, unknown> = {}) => ({
    id: `p${n}`, slug: `trip-${n}`, ownerId: people.owner.uid, ownerName: n % 2 ? 'Ana' : 'Raj', visibility: 'public', title: `Trip ${n}`, description: n % 2 ? 'Beaches and food' : 'Mountains and trains',
    coverImage: '', destinationIds: [n % 2 ? 'bali' : 'manali'], durationDays: 3, budgetRange: [], travelStyle: 'Budget', tips: [], snapshot: { days: [], items: [], places: [], memories: [] },
    likeCount: 0, saveCount: 0, publishedAt: `2026-10-0${n}T00:00:00.000Z`, ...over,
  })

  beforeEach(async () => {
    for (let n = 1; n <= 7; n++) await setDoc(doc(people.owner.fs, 'publicTrips', `p${n}`), entry(n))
    await setDoc(doc(people.owner.fs, 'publicTrips', 'p-hidden'), entry(8, { id: 'p-hidden', visibility: 'link' }))
    current.db = people.nobody.fs
  })

  it('lists public trips newest first, a page at a time, never the unlisted one', async () => {
    const first = await listPublicPage(null, 3)
    expect(first.items.map((t) => t.id)).toEqual(['p7', 'p6', 'p5'])
    expect(first.nextCursor).toBe('p5')
    const second = await listPublicPage(first.nextCursor, 3)
    expect(second.items.map((t) => t.id)).toEqual(['p4', 'p3', 'p2'])
    const last = await listPublicPage(second.nextCursor, 3)
    expect(last.items.map((t) => t.id)).toEqual(['p1'])
    expect(last.nextCursor).toBeNull()
  })

  it('filters by destination', async () => {
    const page = await listPublicPage(null, 10, { destinationId: 'manali' })
    expect(page.items.map((t) => t.id)).toEqual(['p6', 'p4', 'p2'])
  })

  it('searches title, description and creator, filling a page from several reads', async () => {
    expect((await listPublicPage(null, 10, { q: 'mountains' })).items.map((t) => t.id)).toEqual(['p6', 'p4', 'p2'])
    expect((await listPublicPage(null, 2, { q: 'ana' })).items.map((t) => t.id)).toEqual(['p7', 'p5'])
    expect((await listPublicPage(null, 10, { q: 'nothing matches this' })).items).toEqual([])
  })

  it('knows which destinations have listings, and fetches saved trips by id', async () => {
    expect((await listPublicDestinationIds()).sort()).toEqual(['bali', 'manali'])
    expect((await getPublicTrips(['p1', 'p3', 'gone'])).map((t) => t.id)).toEqual(['p1', 'p3'])
  })
})

describe('link previews for a real published page', () => {
  const REST = 'http://127.0.0.1:8080/v1/projects/demo-wayfarer/databases/(default)/documents'

  /** The app's index.html is read from disk as in the deployed function; the Firestore reads go to the emulator, signed out, under the real rules. */
  function deployment() {
    vi.stubEnv('FIRESTORE_REST_URL', REST)
    vi.stubEnv('APP_SHELL_FILE', join(process.cwd(), 'index.html'))
  }
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  async function publishWithPhotoCover(visibility: 'public' | 'link') {
    await onDevice('owner')
    const trip = await tripRepo.create({ title: 'Kyoto <3 "Temples"', destinationIds: ['kyoto'], startDate: '2026-12-01', endDate: '2026-12-04', timezone: 'Asia/Tokyo', travellers: { group: 'solo', count: 1 }, budget: { tier: 'comfort' }, interests: [], planningStyle: 'manual' })
    await tripRepo.update(trip.id, { coverImage: 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 7, 7, 7]).toString('base64') })
    const page = await publicTripRepo.publish(trip.id, { description: 'Tea, shrines and long walks.', visibility })
    await sync()
    return page
  }

  it('the page a visitor is sent to carries the trip’s title, description and photo', async () => {
    const page = await publishWithPhotoCover('public')
    deployment()
    const res = await previewPage(new Request(`https://wayfarer.test/api/og?slug=${page.slug}`))
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('<title>Kyoto &lt;3 &quot;Temples&quot; · Wayfarer</title>')
    expect(html).toContain('og:description" content="Tea, shrines and long walks.')
    expect(html).toContain(`og:image" content="https://wayfarer.test/api/og-image?slug=${page.slug}"`)
    expect(html).not.toContain('noindex')

    const image = await previewImage(new Request(`https://wayfarer.test/api/og-image?slug=${page.slug}`))
    expect(image.headers.get('Content-Type')).toBe('image/jpeg')
    expect([...new Uint8Array(await image.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xe0, 7, 7, 7])
  })

  it('an unlisted page still previews, but asks search engines to leave it out', async () => {
    const page = await publishWithPhotoCover('link')
    deployment()
    const html = await (await previewPage(new Request(`https://wayfarer.test/api/og?slug=${page.slug}`))).text()
    expect(html).toContain('<meta name="robots" content="noindex" />')
  })

  it('a page that was unpublished no longer previews', async () => {
    const page = await publishWithPhotoCover('public')
    await publicTripRepo.unpublish(page.tripId!)
    await sync()
    deployment()
    expect((await previewPage(new Request(`https://wayfarer.test/api/og?slug=${page.slug}`))).status).toBe(404)
  })
})
