import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as deleteAccount } from '../../api/account/delete'
import { deleteAccountData } from '../../api/_lib/account/delete'
import { resetTokenCache } from '../../api/_lib/admin/google'

/**
 * Account deletion against the real emulators: two people with a shared trip, published pages, likes and invitations.
 * Data is written as an administrator (as the server does); what must be gone, and what must survive, is checked after.
 */
const FS = 'http://127.0.0.1:8080/v1/projects/demo-wayfarer/databases/(default)/documents'
const realFetch = globalThis.fetch.bind(globalThis)
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

type Plain = string | number | boolean | Plain[] | { [k: string]: Plain }
const enc = (v: Plain): unknown =>
  typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) }
    : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
const put = (path: string, data: Record<string, Plain>) =>
  realFetch(`${FS}/${path}`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify({ fields: (enc(data) as { mapValue: { fields: unknown } }).mapValue.fields }) }).then((r) => { if (!r.ok) throw new Error(`put ${path} ${r.status}`) })
const read = async (path: string) => {
  const r = await realFetch(`${FS}/${path}`, { headers: ADMIN })
  return r.status === 200 ? ((await r.json()) as { fields: Record<string, { integerValue?: string; stringValue?: string; mapValue?: { fields?: Record<string, unknown> } }> }).fields : undefined
}
const exists = async (path: string) => (await read(path)) !== undefined

let a = { uid: '', token: '' }
let b = { uid: '', token: '' }

async function signUp(name: string) {
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x' }, `acct-${name}`)
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, `acct.${name}.${Date.now()}@example.com`, 'password-123')
  return { uid: cred.user.uid, token: await cred.user.getIdToken() }
}

async function seed() {
  const A = a.uid, B = b.uid
  // A owns a trip that B edits; B owns a trip that A edits
  await put('trips/tA', { ownerId: A, title: 'A trip', members: { [A]: 'owner', [B]: 'editor' } })
  for (const part of ['days', 'items', 'bookings', 'checklist', 'memories', 'stories']) await put(`trips/tA/${part}/x1`, { tripId: 'tA' })
  await put('trips/tA/media/m1', { size: 10 })
  await put(`trips/tA/collaborators/collab_${B}`, { tripId: 'tA', userId: B })
  await put('trips/tB', { ownerId: B, title: 'B trip', members: { [B]: 'owner', [A]: 'editor' } })
  await put('trips/tB/items/i1', { tripId: 'tB', title: 'Added by A' })
  await put(`trips/tB/collaborators/collab_${A}`, { tripId: 'tB', userId: A })
  // pages: A published one (with a photo and a link); B published one that A liked and saved
  await put('publicTrips/pA', { ownerId: A, title: 'A page', likeCount: 2, saveCount: 0 })
  await put('publicTrips/pA/media/m1', { size: 5 })
  await put('publicSlugs/a-page-1', { ownerId: A, publicTripId: 'pA' })
  await put('publicTrips/pB', { ownerId: B, title: 'B page', likeCount: 4, saveCount: 3 })
  await put(`users/${A}/likedTrips/lk_${A}_pB`, { publicTripId: 'pB' })
  await put(`users/${A}/savedTrips/sv_${A}_pB`, { publicTripId: 'pB' })
  // A's private things
  await put(`users/${A}`, { name: 'Amy' })
  for (const part of ['savedPlaces', 'notifications', 'aiConversations', 'aiMessages', 'usage', 'devices', 'pushLog']) await put(`users/${A}/${part}/p1`, { n: 1 })
  await put(`users/${B}`, { name: 'Bo' })
  await put(`users/${B}/notifications/n1`, { n: 1 })
  // invitations: one A sent, one sent to A, one unrelated
  await put('invites/tA__friend@example.com', { tripId: 'tA', invitedBy: A, email: 'friend@example.com', status: 'pending' })
  await put('invites/tB__amy@example.com', { tripId: 'tB', invitedBy: B, email: 'amy@example.com', status: 'pending' })
  await put('feedback/fA', { uid: A, message: 'my feedback' })
  await put('feedback/fB', { uid: B, message: 'their feedback' })
  await put('invites/tB__zed@example.com', { tripId: 'tB', invitedBy: B, email: 'zed@example.com', status: 'pending' })
}

beforeAll(async () => { a = await signUp('a'); b = await signUp('b') })
beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-wayfarer')
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'fake-key')
  vi.stubEnv('IDENTITY_TOOLKIT_URL', 'http://127.0.0.1:9099/identitytoolkit.googleapis.com')
  vi.stubEnv('FIRESTORE_REST_URL', FS)
  resetTokenCache()
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('deleting an account’s data', () => {
  it('removes what the person owns, with everything inside it', async () => {
    await seed()
    const report = await deleteAccountData(a.uid, 'amy@example.com')
    expect(report).toMatchObject({ ownedTrips: 1, leftTrips: 1, publishedPages: 1 })
    for (const p of ['trips/tA', 'trips/tA/days/x1', 'trips/tA/items/x1', 'trips/tA/bookings/x1', 'trips/tA/checklist/x1', 'trips/tA/memories/x1', 'trips/tA/stories/x1', 'trips/tA/media/m1', `trips/tA/collaborators/collab_${b.uid}`]) {
      expect(await exists(p), p).toBe(false)
    }
    expect(await exists('publicTrips/pA')).toBe(false)
    expect(await exists('publicTrips/pA/media/m1')).toBe(false)
    expect(await exists('publicSlugs/a-page-1')).toBe(false)
  })

  it('removes the person’s private data and profile', async () => {
    await seed()
    await deleteAccountData(a.uid)
    expect(await exists(`users/${a.uid}`)).toBe(false)
    for (const part of ['savedPlaces', 'notifications', 'aiConversations', 'aiMessages', 'usage', 'devices', 'pushLog']) expect(await exists(`users/${a.uid}/${part}/p1`), part).toBe(false)
    expect(await exists(`users/${a.uid}/likedTrips/lk_${a.uid}_pB`)).toBe(false)
    expect(await exists(`users/${a.uid}/savedTrips/sv_${a.uid}_pB`)).toBe(false)
  })

  it('takes the person off trips shared with them but leaves those trips to the others', async () => {
    await seed()
    await deleteAccountData(a.uid)
    const members = (await read('trips/tB'))!.members!.mapValue!.fields!
    expect(Object.keys(members)).toEqual([b.uid])
    expect(await exists('trips/tB/items/i1')).toBe(true) // what they added to someone else’s trip stays with that trip
    expect(await exists(`trips/tB/collaborators/collab_${a.uid}`)).toBe(false)
  })

  it('gives the like and save back to the page they were on', async () => {
    await seed()
    await deleteAccountData(a.uid)
    const page = (await read('publicTrips/pB'))!
    expect(page.likeCount!.integerValue).toBe('3')
    expect(page.saveCount!.integerValue).toBe('2')
  })

  it('removes invitations they sent and ones sent to their verified email, and no one else’s', async () => {
    await seed()
    await deleteAccountData(a.uid, 'amy@example.com')
    expect(await exists('invites/tA__friend@example.com')).toBe(false)
    expect(await exists('invites/tB__amy@example.com')).toBe(false)
    expect(await exists('invites/tB__zed@example.com')).toBe(true)
  })

  it('removes the feedback they sent, and only theirs', async () => {
    await seed()
    await deleteAccountData(a.uid)
    expect(await exists('feedback/fA')).toBe(false)
    expect(await exists('feedback/fB')).toBe(true)
  })

  it('leaves everyone else’s data alone', async () => {
    await seed()
    await deleteAccountData(a.uid)
    for (const p of ['trips/tB', 'publicTrips/pB', `users/${b.uid}`, `users/${b.uid}/notifications/n1`]) expect(await exists(p), p).toBe(true)
  })

  it('can be run again after a failure part-way, or for an account with nothing stored', async () => {
    await seed()
    await deleteAccountData(a.uid)
    expect(await deleteAccountData(a.uid)).toMatchObject({ ownedTrips: 0, leftTrips: 0, publishedPages: 0 })
    expect(await deleteAccountData('nobody')).toMatchObject({ ownedTrips: 0, documents: 0 })
  })
})

describe('the delete-account endpoint', () => {
  const call = (token?: string) => deleteAccount(new Request('https://x.test/api/account/delete', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {} }))

  it('needs someone signed in', async () => {
    expect((await call()).status).toBe(401)
    expect((await call('not-a-token')).status).toBe(401)
  })

  it('deletes the data and then the sign-in itself, for a recent sign-in', async () => {
    const fresh = await signUp('fresh')
    await put(`users/${fresh.uid}`, { name: 'Fresh' })
    await put('trips/tF', { ownerId: fresh.uid, members: { [fresh.uid]: 'owner' } })
    const res = await call(fresh.token)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ deleted: true, ownedTrips: 1 })
    expect(await exists(`users/${fresh.uid}`)).toBe(false)
    expect(await exists('trips/tF')).toBe(false)
    expect((await call(fresh.token)).status).toBe(401) // the account is gone: the same token no longer works
  })

  it('asks to sign in again when the sign-in is more than ten minutes old, and deletes nothing', async () => {
    const old = await signUp('old')
    await put(`users/${old.uid}`, { name: 'Old' })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 11 * 60_000)
    const res = await call(old.token)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'recent_login_required' })
    expect(await exists(`users/${old.uid}`)).toBe(true)
  })

  it('is closed until the server has credentials', async () => {
    vi.stubEnv('FIRESTORE_REST_URL', '')
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', '')
    const res = await call((await signUp('nocreds')).token)
    expect(res.status).toBe(503)
  })
})
