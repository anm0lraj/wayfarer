import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { Bytes, collection, getDocs, query, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
// One Firestore instance per person per test: a batch can only mix documents from the same instance.
const instances = new Map<string, ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'] extends () => infer R ? R : never>()
const as = (uid: string | null, claims: Record<string, unknown> = {}) => {
  const key = `${uid}|${JSON.stringify(claims)}`
  if (!instances.has(key)) instances.set(key, (uid ? env.authenticatedContext(uid, claims) : env.unauthenticatedContext()).firestore())
  return instances.get(key)!
}
/** A signed-in Google account: the email is on the token and verified. */
const google = (uid: string, email: string) => as(uid, { email, email_verified: true })

/** A published page with every field the app defines. */
const page = (id: string, over: Record<string, unknown> = {}) => ({
  id, slug: `${id}-slug`, ownerId: 'owner', ownerName: 'Owner', visibility: 'public', title: 'Public', description: 'A trip.', coverImage: '',
  destinationIds: ['bali'], durationDays: 3, budgetRange: [], travelStyle: 'Budget', tips: [], likeCount: 0, saveCount: 0, publishedAt: '2026-10-01T00:00:00.000Z',
  snapshot: { days: [], items: [], places: [], memories: [] }, ...over,
})

const trip = (extra: Record<string, unknown> = {}) => ({ id: 't1', ownerId: 'owner', title: 'Bali', members: { owner: 'owner' }, ...extra })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-wayfarer', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } })
})
afterAll(async () => { await env.cleanup() })
beforeEach(async () => {
  instances.clear()
  await env.clearFirestore()
  // A trip owned by "owner", with an editor and a viewer, and one activity in it.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await db.doc('trips/t1').set(trip({ members: { owner: 'owner', ed: 'editor', vw: 'viewer' } }))
    await db.doc('trips/t1/items/i1').set({ id: 'i1', tripId: 't1', title: 'Temple' })
    await db.doc('invites/t1__amy@example.com').set({ tripId: 't1', tripTitle: 'Bali', email: 'amy@example.com', role: 'editor', status: 'pending', invitedBy: 'owner' })
    await db.doc('publicTrips/p1').set(page('p1', { title: 'Public' }))
    await db.doc('publicTrips/p-link').set(page('p-link', { title: 'Unlisted', visibility: 'link' }))
  })
})

describe('trips', () => {
  it('members can read their trip; strangers and signed-out visitors cannot', async () => {
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(as(u).doc('trips/t1').get())
    await assertFails(as('stranger').doc('trips/t1').get())
    await assertFails(as(null).doc('trips/t1').get())
  })

  it('anyone signed in can create a trip they own, but not one owned by someone else or with extra members', async () => {
    await assertSucceeds(as('amy').doc('trips/t2').set(trip({ id: 't2', ownerId: 'amy', members: { amy: 'owner' } })))
    await assertFails(as('amy').doc('trips/t3').set(trip({ id: 't3', ownerId: 'someone', members: { someone: 'owner' } })))
    await assertFails(as('amy').doc('trips/t4').set(trip({ id: 't4', ownerId: 'amy', members: { amy: 'owner', bob: 'editor' } })))
    await assertFails(as('amy').doc('trips/t5').set(trip({ id: 't5', ownerId: 'amy', members: { amy: 'editor' } })))
  })

  it('the owner can edit and share; an editor can edit but not change who has access or who owns it', async () => {
    await assertSucceeds(as('owner').doc('trips/t1').update({ title: 'Bali!' }))
    await assertSucceeds(as('owner').doc('trips/t1').update({ 'members.new': 'viewer' }))
    await assertSucceeds(as('ed').doc('trips/t1').update({ title: 'Bali edit' }))
    await assertFails(as('ed').doc('trips/t1').update({ 'members.ed': 'owner' }))
    await assertFails(as('ed').doc('trips/t1').update({ ownerId: 'ed' }))
    await assertFails(as('vw').doc('trips/t1').update({ title: 'nope' }))
    await assertFails(as('stranger').doc('trips/t1').update({ title: 'nope' }))
  })

  it('the owner cannot be removed from their own trip, or hand it over by editing the owner field', async () => {
    await assertFails(as('owner').doc('trips/t1').update({ ownerId: 'ed' }))
    await assertFails(as('owner').doc('trips/t1').update({ 'members.owner': 'viewer' }))
  })

  it('only the owner can delete the trip', async () => {
    await assertFails(as('ed').doc('trips/t1').delete())
    await assertFails(as('vw').doc('trips/t1').delete())
    await assertSucceeds(as('owner').doc('trips/t1').delete())
  })
})

describe('inside a trip', () => {
  it('members read; editors and owners write; viewers and strangers do not', async () => {
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(as(u).doc('trips/t1/items/i1').get())
    await assertFails(as('stranger').doc('trips/t1/items/i1').get())

    const item = { id: 'i2', tripId: 't1', title: 'Beach' }
    await assertSucceeds(as('ed').doc('trips/t1/items/i2').set(item))
    await assertSucceeds(as('owner').doc('trips/t1/items/i3').set({ ...item, id: 'i3' }))
    await assertFails(as('vw').doc('trips/t1/items/i4').set({ ...item, id: 'i4' }))
    await assertFails(as('stranger').doc('trips/t1/items/i5').set({ ...item, id: 'i5' }))
    await assertFails(as('vw').doc('trips/t1/items/i1').delete())
    await assertSucceeds(as('ed').doc('trips/t1/items/i1').delete())
  })

  it('a document must name the trip it is stored under', async () => {
    await assertFails(as('ed').doc('trips/t1/items/x').set({ id: 'x', tripId: 'other-trip', title: 'Sneaky' }))
    await assertFails(as('ed').doc('trips/t1/items/y').set({ id: 'y', title: 'No trip id' }))
  })

  it('only the owner manages collaborators', async () => {
    const c = { id: 'c1', tripId: 't1', userId: 'zed', role: 'viewer', status: 'accepted' }
    await assertSucceeds(as('owner').doc('trips/t1/collaborators/c1').set(c))
    await assertFails(as('ed').doc('trips/t1/collaborators/c2').set({ ...c, id: 'c2' }))
  })

  it('unknown collections inside a trip stay closed', async () => {
    await assertFails(as('owner').doc('trips/t1/secrets/s1').set({ tripId: 't1' }))
  })
})

describe('photos and voice notes', () => {
  const bytes = (n: number) => Bytes.fromUint8Array(new Uint8Array(n))
  const media = (over: Record<string, unknown> = {}) => ({ id: 'm1', tripId: 't1', mime: 'image/jpeg', size: 4, data: bytes(4), ...over })

  it('members read them; editors and owners add them; viewers and strangers cannot', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1/media/m0').set(media({ id: 'm0' })) })
    for (const u of ['owner', 'ed', 'vw']) await assertSucceeds(as(u).doc('trips/t1/media/m0').get())
    await assertFails(as('stranger').doc('trips/t1/media/m0').get())
    await assertSucceeds(as('ed').doc('trips/t1/media/m1').set(media()))
    await assertSucceeds(as('owner').doc('trips/t1/media/m2').set(media({ id: 'm2', mime: 'audio/webm' })))
    await assertFails(as('vw').doc('trips/t1/media/m3').set(media({ id: 'm3' })))
    await assertFails(as('stranger').doc('trips/t1/media/m4').set(media({ id: 'm4' })))
  })

  it('only images and audio, and kept within the size Firestore can hold', async () => {
    await assertSucceeds(as('ed').doc('trips/t1/media/a').set(media({ id: 'a', data: bytes(900_000) })))
    await assertFails(as('ed').doc('trips/t1/media/b').set(media({ id: 'b', data: bytes(900_001) })))
    await assertFails(as('ed').doc('trips/t1/media/c').set(media({ id: 'c', mime: 'video/mp4' })))
    await assertFails(as('ed').doc('trips/t1/media/d').set(media({ id: 'd', mime: 'text/html' })))
  })

  it('belong to the trip they are stored under', async () => {
    await assertFails(as('ed').doc('trips/t1/media/x').set(media({ id: 'x', tripId: 'other' })))
  })

  it('editors can delete them; viewers cannot', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1/media/m0').set(media({ id: 'm0' })) })
    await assertFails(as('vw').doc('trips/t1/media/m0').delete())
    await assertSucceeds(as('ed').doc('trips/t1/media/m0').delete())
  })
})

describe('personal data', () => {
  it('is readable and writable only by the person it belongs to', async () => {
    await assertSucceeds(as('amy').doc('users/amy').set({ name: 'Amy' }))
    await assertSucceeds(as('amy').doc('users/amy/notifications/n1').set({ id: 'n1' }))
    await assertFails(as('bob').doc('users/amy').get())
    await assertFails(as('bob').doc('users/amy/notifications/n1').get())
    await assertFails(as(null).doc('users/amy').get())
  })
})

describe('published trips', () => {
  it('anyone can read them, even signed out', async () => {
    await assertSucceeds(as(null).doc('publicTrips/p1').get())
  })

  it('only the publisher can create, change or remove one', async () => {
    await assertSucceeds(as('amy').doc('publicTrips/p2').set(page('p2', { ownerId: 'amy', title: 'Mine' })))
    await assertFails(as('amy').doc('publicTrips/p3').set(page('p3', { ownerId: 'bob', title: 'Not mine' })))
    await assertFails(as(null).doc('publicTrips/p4').set(page('p4', { ownerId: 'x' })))
    await assertFails(as('amy').doc('publicTrips/p1').update({ title: 'Hijacked' }))
    await assertSucceeds(as('owner').doc('publicTrips/p1').update({ title: 'Edited' }))
    await assertFails(as('amy').doc('publicTrips/p1').delete())
    await assertSucceeds(as('owner').doc('publicTrips/p1').delete())
  })
})

describe('what a published page may contain', () => {
  const owner = () => as('owner')
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `i${i}` }))

  it('accepts a complete page, and edits to it', async () => {
    await assertSucceeds(owner().doc('publicTrips/ok').set(page('ok')))
    await assertSucceeds(owner().doc('publicTrips/ok').update({ description: 'Edited.' }))
  })

  it('refuses fields the app does not define, at the top and inside the snapshot', async () => {
    await assertFails(owner().doc('publicTrips/x1').set(page('x1', { privateNotes: 'gate code 4821' })))
    await assertFails(owner().doc('publicTrips/x2').set(page('x2', { snapshot: { days: [], items: [], places: [], memories: [], bookings: [{ confirmation: 'ABC123' }] } })))
    await assertFails(owner().doc('publicTrips/ok').update({ confirmationNumber: 'ABC123' }))
  })

  it('refuses a page that is absurdly large or has an unknown visibility', async () => {
    await assertSucceeds(owner().doc('publicTrips/big-ok').set(page('big-ok', { snapshot: { days: [], items: items(500), places: [], memories: [] } })))
    await assertFails(owner().doc('publicTrips/big').set(page('big', { snapshot: { days: [], items: items(501), places: [], memories: [] } })))
    await assertFails(owner().doc('publicTrips/long').set(page('long', { title: 'x'.repeat(201) })))
    await assertFails(owner().doc('publicTrips/vis').set(page('vis', { visibility: 'everyone' })))
    await assertFails(owner().doc('publicTrips/neg').set(page('neg', { likeCount: -1 })))
  })

  it('does not get in the way of other people’s likes and saves', async () => {
    await assertSucceeds(owner().doc('publicTrips/ok2').set(page('ok2')))
    const batch = as('amy').batch()
    batch.set(as('amy').doc('users/amy/likedTrips/lk_amy_ok2'), { id: 'lk_amy_ok2', userId: 'amy', publicTripId: 'ok2', likedAt: '2026-10-01T00:00:00.000Z' })
    batch.update(as('amy').doc('publicTrips/ok2'), { likeCount: 1 })
    await assertSucceeds(batch.commit())
  })
})

describe('finding published trips', () => {
  it('anyone can open one by its id, listed or not; only public ones can be listed', async () => {
    await assertSucceeds(as(null).doc('publicTrips/p1').get())
    await assertSucceeds(as(null).doc('publicTrips/p-link').get())
    const listed = (db: ReturnType<typeof as>) => db.collection('publicTrips').where('visibility', '==', 'public').get()
    await assertSucceeds(listed(as(null)))
    await assertFails(as(null).collection('publicTrips').get()) // an unfiltered list would reveal the unlisted ones
    await assertFails(as('amy').collection('publicTrips').where('visibility', '==', 'link').get())
  })

  it('a short link opens its page without being listable', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('publicSlugs/bali-ab12').set({ publicTripId: 'p-link', ownerId: 'owner' }) })
    await assertSucceeds(as(null).doc('publicSlugs/bali-ab12').get())
    await assertFails(as(null).collection('publicSlugs').get())
    await assertSucceeds(as('owner').doc('publicSlugs/new-1').set({ publicTripId: 'p1', ownerId: 'owner' }))
    await assertFails(as('amy').doc('publicSlugs/new-2').set({ publicTripId: 'p1', ownerId: 'owner' })) // not yours to claim
    await assertSucceeds(as('owner').doc('publicSlugs/bali-ab12').set({ publicTripId: 'p-link', ownerId: 'owner' })) // republishing rewrites it
    await assertFails(as('amy').doc('publicSlugs/bali-ab12').set({ publicTripId: 'p1', ownerId: 'amy' })) // not hers to take over
    await assertFails(as('owner').doc('publicSlugs/bali-ab12').set({ publicTripId: 'p-link', ownerId: 'amy' })) // nor to hand away
    await assertFails(as('amy').doc('publicSlugs/bali-ab12').delete())
    await assertSucceeds(as('owner').doc('publicSlugs/bali-ab12').delete())
  })

  it('photos on a published page are readable by anyone, writable only by the publisher, and kept small', async () => {
    const bytes = (n: number) => Bytes.fromUint8Array(new Uint8Array(n))
    const m = { id: 'm1', mime: 'image/jpeg', size: 4, data: bytes(4) }
    await assertSucceeds(as('owner').doc('publicTrips/p1/media/m1').set(m))
    await assertSucceeds(as(null).doc('publicTrips/p1/media/m1').get())
    await assertFails(as('amy').doc('publicTrips/p1/media/m2').set({ ...m, id: 'm2' }))
    await assertFails(as('owner').doc('publicTrips/p1/media/m3').set({ ...m, id: 'm3', data: bytes(900_001) }))
    await assertFails(as('owner').doc('publicTrips/p1/media/m4').set({ ...m, id: 'm4', mime: 'video/mp4' }))
    await assertFails(as('amy').doc('publicTrips/p1/media/m1').delete())
    await assertSucceeds(as('owner').doc('publicTrips/p1/media/m1').delete())
  })
})

describe('likes and saves of a published trip', () => {
  const amy = () => as('amy')
  const likeDoc = (db: ReturnType<typeof as>) => db.doc('users/amy/likedTrips/lk_amy_p1')
  const like = { id: 'lk_amy_p1', userId: 'amy', publicTripId: 'p1', likedAt: '2026-10-01T00:00:00.000Z' }

  async function setCounts(likeCount: number, saveCount = 0) {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('publicTrips/p1').update({ likeCount, saveCount }) })
  }

  it('liking records the like and raises the count by one, together', async () => {
    const batch = amy().batch()
    batch.set(likeDoc(amy()), like)
    batch.update(amy().doc('publicTrips/p1'), { likeCount: 1 })
    await assertSucceeds(batch.commit())
  })

  it('a like without the count, or a count without the like, or the wrong amount, is refused', async () => {
    await assertFails(likeDoc(amy()).set(like))
    await assertFails(amy().doc('publicTrips/p1').update({ likeCount: 1 }))
    const twice = amy().batch()
    twice.set(likeDoc(amy()), like)
    twice.update(amy().doc('publicTrips/p1'), { likeCount: 2 })
    await assertFails(twice.commit())
  })

  it('a like must carry the right id and belong to the person liking', async () => {
    const wrongId = amy().batch()
    wrongId.set(amy().doc('users/amy/likedTrips/anything'), like)
    wrongId.update(amy().doc('publicTrips/p1'), { likeCount: 1 })
    await assertFails(wrongId.commit())
    const asOther = as('bob').batch()
    asOther.set(as('bob').doc('users/amy/likedTrips/lk_amy_p1'), like)
    asOther.update(as('bob').doc('publicTrips/p1'), { likeCount: 1 })
    await assertFails(asOther.commit())
  })

  it('unliking removes the like and lowers the count together; neither alone is allowed', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc('users/amy/likedTrips/lk_amy_p1').set(like)
      await ctx.firestore().doc('publicTrips/p1').update({ likeCount: 1 })
    })
    await assertFails(likeDoc(amy()).delete()) // would let the count drift
    await assertFails(amy().doc('publicTrips/p1').update({ likeCount: 0 }))
    const undo = amy().batch()
    undo.delete(likeDoc(amy()))
    undo.update(amy().doc('publicTrips/p1'), { likeCount: 0 })
    await assertSucceeds(undo.commit())
  })

  it('the count cannot be moved without a like, so it cannot be inflated by repeating', async () => {
    await setCounts(5)
    await assertFails(amy().doc('publicTrips/p1').update({ likeCount: 6 }))
    await assertFails(amy().doc('publicTrips/p1').update({ likeCount: 4 }))
    await assertFails(amy().doc('publicTrips/p1').update({ likeCount: 1000 }))
  })

  it('saving works the same way with its own counter, and saving one of your own trips needs no counter', async () => {
    const save = { id: 'sv_amy_p1', userId: 'amy', publicTripId: 'p1', savedAt: '2026-10-01T00:00:00.000Z' }
    await assertFails(amy().doc('users/amy/savedTrips/sv_amy_p1').set(save))
    const batch = amy().batch()
    batch.set(amy().doc('users/amy/savedTrips/sv_amy_p1'), save)
    batch.update(amy().doc('publicTrips/p1'), { saveCount: 1 })
    await assertSucceeds(batch.commit())
    await assertSucceeds(amy().doc('users/amy/savedTrips/sv_own').set({ id: 'sv_own', userId: 'amy', tripId: 't9', savedAt: '2026-10-01T00:00:00.000Z' }))
  })

  it('the publisher can still edit their own page; nobody else can', async () => {
    await assertSucceeds(as('owner').doc('publicTrips/p1').update({ title: 'Edited' }))
    await assertFails(amy().doc('publicTrips/p1').update({ title: 'Hijacked' }))
    await assertFails(amy().doc('publicTrips/p1').update({ ownerId: 'amy' }))
  })

  it('likes and saves stay private to their owner', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('users/amy/likedTrips/lk_amy_p1').set(like) })
    await assertSucceeds(likeDoc(amy()).get())
    await assertFails(likeDoc(as('bob')).get())
  })
})

describe('the assistant’s daily allowance', () => {
  const today = '2026-10-04'
  const doc = (db: ReturnType<typeof as>) => db.doc(`users/amy/usage/${today}`)

  it('starts at the cost of the first request and can only go up, a request at a time', async () => {
    await assertSucceeds(doc(as('amy')).set({ count: 1 }))
    await assertSucceeds(doc(as('amy')).update({ count: 2 }))
    await assertSucceeds(doc(as('amy')).update({ count: 5 })) // an itinerary costs 3
  })

  it('cannot be lowered, deleted, jumped, or started high, so it cannot be reset to get more', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(`users/amy/usage/${today}`).set({ count: 10 }) })
    await assertFails(doc(as('amy')).update({ count: 0 }))
    await assertFails(doc(as('amy')).update({ count: 9 }))
    await assertFails(doc(as('amy')).update({ count: 10 }))
    await assertFails(doc(as('amy')).update({ count: 14 }))
    await assertFails(doc(as('amy')).delete())
    await assertFails(doc(as('amy')).set({ count: 1 })) // a fresh write is an update too
    await assertFails(as('amy').doc('users/amy/usage/2026-10-05').set({ count: 50 }))
    await assertFails(as('amy').doc('users/amy/usage/not-a-day').set({ count: 1 }))
  })

  it('belongs to its owner alone', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(`users/amy/usage/${today}`).set({ count: 3 }) })
    await assertSucceeds(doc(as('amy')).get())
    await assertFails(doc(as('bob')).get())
    await assertFails(as('bob').doc(`users/amy/usage/2026-10-06`).set({ count: 1 }))
  })
})

describe('push devices', () => {
  const device = { token: 'x'.repeat(40), tz: 'Asia/Kolkata', platform: 'web', updatedAt: '2026-10-04T10:00:00.000Z' }

  it('lets a person register, refresh and remove their own device', async () => {
    const ref = as('amy').doc('users/amy/devices/dev1')
    await assertSucceeds(ref.set(device))
    await assertSucceeds(ref.set({ ...device, token: 'y'.repeat(60) }))
    await assertSucceeds(ref.get())
    await assertSucceeds(ref.delete())
  })

  it('keeps one person’s tokens from anyone else', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('users/amy/devices/dev1').set(device) })
    await assertFails(as('bob').doc('users/amy/devices/dev1').get())
    await assertFails(as('bob').doc('users/amy/devices/dev2').set(device))
    await assertFails(as('bob').doc('users/amy/devices/dev1').delete())
  })

  it('accepts only the fields a device record has, at sane sizes', async () => {
    const ref = as('amy').doc('users/amy/devices/dev1')
    await assertFails(ref.set({ ...device, extra: 'x' }))
    await assertFails(ref.set({ ...device, token: 'short' }))
    await assertFails(ref.set({ ...device, token: 'x'.repeat(5000) }))
    await assertFails(ref.set({ ...device, platform: 'toaster' }))
    await assertFails(ref.set({ token: device.token }))
  })

  it('keeps the log of sent reminders to the server', async () => {
    await assertFails(as('amy').doc('users/amy/pushLog/abc').set({ key: 'k' }))
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('users/amy/pushLog/abc').set({ key: 'k' }) })
    await assertFails(as('amy').doc('users/amy/pushLog/abc').get())
    await assertFails(as('amy').doc('users/amy/pushLog/abc').delete())
  })
})

describe('feedback', () => {
  const note = { uid: 'amy', message: 'The map is blank on my phone', route: '/trips/t1/map', version: 'abc1234', agent: 'Chrome', createdAt: '2026-10-05T10:00:00.000Z' }

  it('lets a signed-in person leave their own message, and no one read it back', async () => {
    await assertSucceeds(as('amy').collection('feedback').add(note))
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('feedback/f1').set(note) })
    await assertFails(as('amy').doc('feedback/f1').get())
    await assertFails(as('amy').doc('feedback/f1').update({ message: 'changed' }))
    await assertFails(as('amy').doc('feedback/f1').delete())
  })

  it('refuses messages left in someone else’s name, signed out, empty, oversized or with extra fields', async () => {
    await assertFails(as('bob').collection('feedback').add(note))
    await assertFails(env.unauthenticatedContext().firestore().collection('feedback').add(note))
    await assertFails(as('amy').collection('feedback').add({ ...note, message: '' }))
    await assertFails(as('amy').collection('feedback').add({ ...note, message: 'x'.repeat(2001) }))
    await assertFails(as('amy').collection('feedback').add({ ...note, extra: 1 }))
  })
})

describe('everything else', () => {
  it('is closed', async () => {
    await assertFails(as('owner').doc('admin/config').get())
    await assertFails(as('owner').doc('places/p-dps').set({ name: 'x' }))
  })
})

describe('invitations', () => {
  const invite = (over: Record<string, unknown> = {}) => ({ tripId: 't1', tripTitle: 'Bali', email: 'bob@example.com', role: 'viewer', status: 'pending', invitedBy: 'owner', ...over })

  it('only the trip owner can invite, by email, as editor or viewer', async () => {
    await assertSucceeds(as('owner').doc('invites/t1__bob@example.com').set(invite()))
    await assertFails(as('ed').doc('invites/t1__bob@example.com').set(invite({ invitedBy: 'ed' })))
    await assertFails(as('stranger').doc('invites/t1__bob@example.com').set(invite({ invitedBy: 'stranger' })))
    await assertFails(as('owner').doc('invites/t1__bob@example.com').set(invite({ role: 'owner' })))
    await assertFails(as('owner').doc('invites/wrong-id').set(invite()))
    await assertFails(as('owner').doc('invites/t1__Bob@Example.com').set(invite({ email: 'Bob@Example.com' })))
    await assertFails(as('owner').doc('invites/t1__bob@example.com').set(invite({ status: 'accepted' })))
  })

  it('the invited person sees their invitations, and nobody else does', async () => {
    const mine = await assertSucceeds(getDocs(query(collection(google('amy-uid', 'amy@example.com') as never, 'invites'), where('email', '==', 'amy@example.com'))))
    await assertSucceeds(Promise.resolve(mine))
    await assertFails(getDocs(query(collection(google('zed', 'zed@example.com') as never, 'invites'), where('email', '==', 'amy@example.com'))))
    await assertFails(as('stranger').doc('invites/t1__amy@example.com').get())
    // The owner sees the invitations they sent.
    await assertSucceeds(getDocs(query(collection(as('owner') as never, 'invites'), where('tripId', '==', 't1'), where('invitedBy', '==', 'owner'))))
  })

  it('accepting adds you to the trip with exactly the offered role', async () => {
    await assertSucceeds(google('amy-uid', 'amy@example.com').doc('trips/t1').update({ 'members.amy-uid': 'editor' }))
  })

  it('accepting cannot be used to take more than was offered, or to change anything else', async () => {
    const amy = () => google('amy-uid', 'amy@example.com')
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'owner' }))
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'viewer' })) // offered editor, not viewer
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'editor', title: 'Mine now' }))
    await assertFails(amy().doc('trips/t1').update({ 'members.amy-uid': 'editor', 'members.friend': 'editor' }))
  })

  it('accepting needs a verified email that matches the invitation', async () => {
    await assertFails(as('amy-uid', { email: 'amy@example.com', email_verified: false }).doc('trips/t1').update({ 'members.amy-uid': 'editor' }))
    await assertFails(google('zed', 'zed@example.com').doc('trips/t1').update({ 'members.zed': 'editor' })) // no invitation for zed
    await assertFails(as('amy-uid').doc('trips/t1').update({ 'members.amy-uid': 'editor' })) // no email on the token
  })

  it('a declined or already used invitation cannot be accepted', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('invites/t1__amy@example.com').update({ status: 'declined' }) })
    await assertFails(google('amy-uid', 'amy@example.com').doc('trips/t1').update({ 'members.amy-uid': 'editor' }))
  })

  it('once in, a member can record themselves as a collaborator, at their own role only', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc('trips/t1').update({ 'members.amy-uid': 'editor' }) })
    const amy = () => google('amy-uid', 'amy@example.com')
    const me = { id: 'c1', tripId: 't1', userId: 'amy-uid', role: 'editor', status: 'accepted' }
    await assertSucceeds(amy().doc('trips/t1/collaborators/c1').set(me))
    await assertFails(amy().doc('trips/t1/collaborators/c2').set({ ...me, id: 'c2', role: 'owner' }))
    await assertFails(amy().doc('trips/t1/collaborators/c3').set({ ...me, id: 'c3', userId: 'someone-else' }))
  })

  it('the invited person can answer the invitation but not rewrite it', async () => {
    const amy = () => google('amy-uid', 'amy@example.com')
    await assertFails(amy().doc('invites/t1__amy@example.com').update({ role: 'owner' }))
    await assertFails(amy().doc('invites/t1__amy@example.com').update({ status: 'pending-forever' }))
    await assertSucceeds(amy().doc('invites/t1__amy@example.com').update({ status: 'accepted' }))
  })

  it('the owner can withdraw an invitation', async () => {
    await assertSucceeds(as('owner').doc('invites/t1__amy@example.com').delete())
    await assertFails(as('stranger').doc('invites/t1__amy@example.com').delete())
  })
})
