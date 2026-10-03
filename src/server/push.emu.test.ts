import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as testPush } from '../../api/push/test'
import { runSweep } from '../../api/_lib/push/sweep'
import { resetTokenCache } from '../../api/_lib/push/google'

/**
 * The push sweep against the real Firestore emulator (so queries, subcollection reads and create-if-absent are the real
 * thing), with only Google's message endpoint faked. Data is written as an administrator, like the server does.
 */
const FS = 'http://127.0.0.1:8080/v1/projects/demo-wayfarer/databases/(default)/documents'
const realFetch = globalThis.fetch.bind(globalThis)
let sent: Array<{ token: string; data: Record<string, string> }> = []
let fcmStatus: (token: string) => number = () => 200
let uid = ''
let idToken = ''

type Plain = string | number | boolean | Plain[] | { [k: string]: Plain }
const enc = (v: Plain): unknown =>
  typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) }
    : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } }
const put = (path: string, data: Record<string, Plain>) =>
  realFetch(`${FS}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: (enc(data) as { mapValue: { fields: unknown } }).mapValue.fields }) }).then((r) => { if (!r.ok) throw new Error(`put ${path} ${r.status}`) })
const exists = async (path: string) => (await realFetch(`${FS}/${path}`, { headers: { Authorization: 'Bearer owner' } })).status === 200
const count = async (collection: string) => ((await (await realFetch(`${FS}/${collection}`, { headers: { Authorization: 'Bearer owner' } })).json()) as { documents?: unknown[] }).documents?.length ?? 0

const TOKEN_A = 'a'.repeat(40)
const TOKEN_B = 'b'.repeat(40)
const device = (token: string, tz = 'Asia/Kolkata') => ({ token, tz, platform: 'web', updatedAt: '2026-10-01T00:00:00.000Z' })

/** A Bali trip (Makassar time) 12–16 Oct, owned by `owner`, with an activity on day 2 at 10:00. */
async function seedTrip(owner: string, over: Record<string, Plain> = {}) {
  await put('trips/t1', { ownerId: owner, title: '5 Days in Bali', destinationIds: ['bali'], startDate: '2026-10-12', endDate: '2026-10-16', timezone: 'Asia/Makassar', state: 'ready', members: { [owner]: 'owner' }, ...over })
  await put('trips/t1/days/d2', { tripId: 't1', dayNumber: 2, date: '2026-10-13' })
  await put('trips/t1/items/i1', { tripId: 't1', dayId: 'd2', startTime: '10:00', durationMin: 60, title: 'Temple visit', status: 'upcoming', position: 1 })
}

const at = (iso: string) => new Date(iso)
const SEVEN_DAYS_OUT = at('2026-10-05T04:30:00Z') // 10:00 in India, 12:30 in Bali, a week before the trip
const MIDNIGHT_IN_INDIA = at('2026-10-04T21:30:00Z') // 03:00 in India

beforeAll(async () => {
  const app = initializeApp({ apiKey: 'fake', projectId: 'demo-wayfarer', authDomain: 'x' }, 'push-test')
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const cred = await createUserWithEmailAndPassword(auth, 'push.person@example.com', 'password-123')
  uid = cred.user.uid
  idToken = await cred.user.getIdToken()
})

beforeEach(async () => {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-wayfarer/databases/(default)/documents', { method: 'DELETE' })
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-wayfarer')
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'fake-key')
  vi.stubEnv('IDENTITY_TOOLKIT_URL', 'http://127.0.0.1:9099/identitytoolkit.googleapis.com')
  vi.stubEnv('FIRESTORE_REST_URL', FS)
  vi.stubEnv('FCM_SEND_URL', 'https://fcm.test/send')
  resetTokenCache()
  sent = []
  fcmStatus = () => 200
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) !== 'https://fcm.test/send') return realFetch(input, init)
    const message = JSON.parse(String(init?.body)).message as { token: string; data: Record<string, string> }
    const status = fcmStatus(message.token)
    if (status === 200) sent.push(message)
    return Promise.resolve(new Response(JSON.stringify(status === 200 ? {} : { error: { status: status === 404 ? 'UNREGISTERED' : 'UNAVAILABLE' } }), { status }))
  })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('the push sweep', () => {
  it('sends the week-before reminder to every device of a trip member, once', async () => {
    await seedTrip('amy-uid', { members: { 'amy-uid': 'owner' } })
    await put('users/amy-uid', { name: 'Amy' })
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    await put('users/amy-uid/devices/d2', device(TOKEN_B))

    const first = await runSweep(SEVEN_DAYS_OUT)
    expect(first).toMatchObject({ people: 1, trips: 1, sent: 1, failures: 0 })
    expect(sent.map((m) => m.token).sort()).toEqual([TOKEN_A, TOKEN_B])
    expect(sent[0]!.data).toEqual({ title: 'Your Bali trip starts in 7 days.', body: 'Time to check your documents, bookings and packing.', link: '/trips/t1/checklist', tag: 'countdown:t1:7' })

    sent = []
    expect(await runSweep(new Date(SEVEN_DAYS_OUT.getTime() + 10 * 60_000))).toMatchObject({ sent: 0 })
    expect(sent).toEqual([]) // ten minutes later, the same reminder is not sent again
  })

  it('only looks at trips the person is a member of', async () => {
    await seedTrip('someone-else')
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ people: 1, trips: 0, sent: 0 })
    expect(sent).toEqual([])
  })

  it('also reaches an editor and a viewer, each on their own devices', async () => {
    await seedTrip('amy-uid', { members: { 'amy-uid': 'owner', 'bob-uid': 'editor', 'cat-uid': 'viewer' } })
    await put('users/bob-uid/devices/d1', device(TOKEN_A))
    await put('users/cat-uid/devices/d1', device(TOKEN_B))
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ people: 2, sent: 2 })
    expect(sent.map((m) => m.token).sort()).toEqual([TOKEN_A, TOKEN_B])
  })

  it('holds sociable reminders overnight and sends them after 08:00 where the person is', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    expect(await runSweep(MIDNIGHT_IN_INDIA)).toMatchObject({ sent: 0, held: 1 })
    expect(sent).toEqual([])
    expect(await count('users/amy-uid/pushLog')).toBe(0) // not marked as sent
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ sent: 1, held: 0 })
  })

  it('does send “your next activity starts soon” at any hour', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    // 09:40 in Bali on day 2 is 07:10 in India, and 20 minutes before the temple visit
    expect(await runSweep(at('2026-10-13T01:40:00Z'))).toMatchObject({ sent: 1 })
    expect(sent[0]!.data).toMatchObject({ title: 'Your next activity starts in 20 minutes.', body: 'Temple visit', link: '/trips/t1/live' })
  })

  it('respects the switches in Settings', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid', { name: 'Amy', settings: { theme: 'system', notificationPrefs: { trip_countdown: false } } })
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ sent: 0 })
    expect(sent).toEqual([])
  })

  it('says nothing about trips that are archived, finished or far away', async () => {
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    await seedTrip('amy-uid', { state: 'archived' })
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ trips: 0, sent: 0 })
    await seedTrip('amy-uid', { state: 'ready' })
    expect(await runSweep(at('2026-11-20T05:00:00Z'))).toMatchObject({ trips: 0, sent: 0 }) // long over
    expect(await runSweep(at('2026-08-01T05:00:00Z'))).toMatchObject({ trips: 0, sent: 0 }) // two months away
  })

  it('removes a device Google says is gone, and keeps reaching the others', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid/devices/dead', device(TOKEN_A))
    await put('users/amy-uid/devices/live', device(TOKEN_B))
    fcmStatus = (t) => (t === TOKEN_A ? 404 : 200)
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ sent: 1, removedDevices: 1 })
    expect(await exists('users/amy-uid/devices/dead')).toBe(false)
    expect(await exists('users/amy-uid/devices/live')).toBe(true)
  })

  it('tries again at the next sweep when Google is having trouble', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    fcmStatus = () => 503
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ sent: 0, failures: 1 })
    expect(await count('users/amy-uid/pushLog')).toBe(0) // not recorded as sent
    fcmStatus = () => 200
    expect(await runSweep(new Date(SEVEN_DAYS_OUT.getTime() + 10 * 60_000))).toMatchObject({ sent: 1 })
  })

  it('ignores device records that are not real tokens', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid/devices/junk', { token: 'short', tz: 'Asia/Kolkata', platform: 'web', updatedAt: '' })
    expect(await runSweep(SEVEN_DAYS_OUT)).toMatchObject({ people: 0, sent: 0 })
  })

  it('does not let two sweeps at the same moment both send', async () => {
    await seedTrip('amy-uid')
    await put('users/amy-uid/devices/d1', device(TOKEN_A))
    const [a, b] = await Promise.all([runSweep(SEVEN_DAYS_OUT), runSweep(SEVEN_DAYS_OUT)])
    expect(a.sent + b.sent).toBe(1)
    expect(sent).toHaveLength(1)
  })
})

describe('the test notification', () => {
  const call = (token = idToken) => testPush(new Request('https://x.test/api/push/test', { method: 'POST', headers: { authorization: `Bearer ${token}` } }))

  it('goes to the signed-in person’s own devices only', async () => {
    await put(`users/${uid}/devices/d1`, device(TOKEN_A))
    await put('users/other-uid/devices/d1', device(TOKEN_B))
    const res = await call()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ devices: 1, sent: 1 })
    expect(sent.map((m) => m.token)).toEqual([TOKEN_A])
    expect(sent[0]!.data.link).toBe('/settings#notifications')
  })

  it('reports no devices, and allows one a minute', async () => {
    expect(await (await call()).json()).toEqual({ devices: 0, sent: 0 })
    expect((await call()).status).toBe(429)
  })

  it('needs someone signed in', async () => {
    expect((await call('not-a-token')).status).toBe(401)
    expect((await testPush(new Request('https://x.test/api/push/test', { method: 'POST' }))).status).toBe(401)
  })
})
