import { createPublicKey, createVerify, generateKeyPairSync } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendPush } from '../../api/_lib/push/fcm'
import { accessToken, resetTokenCache, serviceAccount, signAssertion } from '../../api/_lib/push/google'
import { TIMED_TYPES, buildReminders, effectiveState, placeName, sociableHour, zonedMs } from '../../api/_lib/push/rules'
import { logId } from '../../api/_lib/push/sweep'
import { GET as sweepEndpoint } from '../../api/push/sweep'
import { buildSeed } from '@/data/seedData'
import { buildNotifications } from '@/features/notifications/rules'
import { computeTripState } from '@/features/trips/tripState'
import { zonedIso } from '@/lib/dates'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetTokenCache() })

describe('the server says what the app says', () => {
  const seed = buildSeed()
  // Every hour of the days around each trip, in steps that catch the 30-minute and 7-day/1-day boundaries.
  const instants = (start: string) => {
    const t0 = Date.parse(`${start}T00:00:00Z`) - 9 * 86_400_000
    return Array.from({ length: 9 * 2 + 8 * 24 * 2 }, (_, i) => new Date(t0 + i * 30 * 60_000))
  }

  for (const trip of seed.trips) {
    it(`gives the same reminders for ${trip.title} at every half hour from nine days before`, () => {
      const dest = seed.destinations.find((d) => d.id === trip.destinationIds[0])!
      const days = seed.days.filter((d) => d.tripId === trip.id)
      const items = seed.items.filter((i) => i.tripId === trip.id)
      const bookings = seed.bookings.filter((b) => b.tripId === trip.id)
      let reminders = 0
      for (const now of instants(trip.startDate)) {
        const app = buildNotifications({ trip: { ...trip, place: dest.name, effectiveState: computeTripState(trip, now) }, days, items, bookings, now })
        const server = buildReminders({
          trip: { id: trip.id, place: placeName(trip.destinationIds[0]), startDate: trip.startDate, endDate: trip.endDate, timezone: trip.timezone, state: trip.state },
          days, items, bookings, now,
        })
        expect(server, now.toISOString()).toEqual(app)
        reminders += server.length
      }
      expect(reminders).toBeGreaterThan(0) // the comparison actually saw reminders
    })
  }

  it('turns a destination id into the name the catalogue shows', () => {
    for (const d of seed.destinations) expect(placeName(d.id)).toBe(d.name)
    expect(placeName('new-york')).toBe('New York')
  })

  it('works out a trip’s state and a wall-clock instant like the app', () => {
    for (const trip of seed.trips) for (const now of instants(trip.startDate)) expect(effectiveState(trip, now)).toBe(computeTripState(trip, now))
    expect(new Date(zonedMs('2026-10-13', '09:30', 'Asia/Makassar')).toISOString()).toBe(zonedIso('2026-10-13', '09:30', 'Asia/Makassar'))
  })
})

describe('sociable hours', () => {
  it('is 08:00 to 21:00 where the person is', () => {
    expect(sociableHour(new Date('2026-10-05T02:29:00Z'), 'Asia/Kolkata')).toBe(false) // 07:59
    expect(sociableHour(new Date('2026-10-05T02:30:00Z'), 'Asia/Kolkata')).toBe(true) // 08:00
    expect(sociableHour(new Date('2026-10-05T15:29:00Z'), 'Asia/Kolkata')).toBe(true) // 20:59
    expect(sociableHour(new Date('2026-10-05T15:30:00Z'), 'Asia/Kolkata')).toBe(false) // 21:00
  })
  it('lets only “starts in 30 minutes” through at any hour', () => {
    expect([...TIMED_TYPES]).toEqual(['next_activity'])
  })
})

describe('service account sign-in', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
  const sa = { client_email: 'svc@wayfarer-dev.iam.gserviceaccount.com', private_key: privateKey }

  it('signs an assertion Google can verify, with the scopes it needs and an hour of life', () => {
    const jwt = signAssertion(sa, 1_000_000)
    const [head, claims, sig] = jwt.split('.') as [string, string, string]
    expect(createVerify('RSA-SHA256').update(`${head}.${claims}`).verify(createPublicKey(publicKey), Buffer.from(sig, 'base64url'))).toBe(true)
    const c = JSON.parse(Buffer.from(claims, 'base64url').toString())
    expect(c).toMatchObject({ iss: sa.client_email, iat: 1_000_000, exp: 1_003_600 })
    expect(c.scope).toContain('datastore')
    expect(c.scope).toContain('firebase.messaging')
  })

  it('reads the key as JSON or base64, and says nothing when it is missing or broken', () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', JSON.stringify(sa))
    expect(serviceAccount()?.client_email).toBe(sa.client_email)
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', Buffer.from(JSON.stringify(sa)).toString('base64'))
    expect(serviceAccount()?.client_email).toBe(sa.client_email)
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', 'not json')
    expect(serviceAccount()).toBeUndefined()
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', '')
    expect(serviceAccount()).toBeUndefined()
  })

  it('exchanges the assertion for a token and reuses it until it is nearly out of date', async () => {
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT', JSON.stringify(sa))
    vi.stubEnv('GOOGLE_TOKEN_URL', 'https://oauth.test/token')
    const fetchMock = vi.fn(async () => Response.json({ access_token: 'tok-1', expires_in: 3600 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await accessToken(0)).toBe('tok-1')
    expect(await accessToken(30 * 60_000)).toBe('tok-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await accessToken(3600_000)).toBe('tok-1') // past the safety margin: asked again
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const body = String((fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body)
    expect(body).toContain('grant_type=urn')
  })
})

describe('sending through Firebase Cloud Messaging', () => {
  const sendWith = async (status: number, body: unknown) => {
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'wayfarer-dev-x')
    vi.stubEnv('FIRESTORE_REST_URL', 'http://emulator.test') // token "owner"
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await sendPush('t'.repeat(40), { title: 'Hi', body: 'There', link: '/trips/x', tag: 'k' })
    return { result, fetchMock }
  }

  it('sends only data, to the project’s endpoint, as high priority with a short life', async () => {
    const { result, fetchMock } = await sendWith(200, {})
    expect(result).toBe('sent')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string; headers: Record<string, string> }]
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/wayfarer-dev-x/messages:send')
    const message = JSON.parse(init.body).message
    expect(message.notification).toBeUndefined()
    expect(message.data).toEqual({ title: 'Hi', body: 'There', link: '/trips/x', tag: 'k' })
    expect(message.webpush.headers).toMatchObject({ Urgency: 'high', TTL: '3600' })
  })

  it('tells a dead device from a Google hiccup', async () => {
    expect((await sendWith(404, { error: { status: 'NOT_FOUND' } })).result).toBe('gone')
    expect((await sendWith(400, { error: { status: 'UNREGISTERED' } })).result).toBe('gone')
    expect((await sendWith(503, { error: { status: 'UNAVAILABLE' } })).result).toBe('retry')
    expect((await sendWith(429, {})).result).toBe('retry')
  })

  it('says retry when Google cannot be reached', async () => {
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p')
    vi.stubEnv('FIRESTORE_REST_URL', 'http://emulator.test')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await sendPush('t'.repeat(40), { title: 'a', body: 'b', link: '/', tag: 'k' })).toBe('retry')
  })
})

describe('the sweep endpoint', () => {
  const call = (auth?: string) => sweepEndpoint(new Request('https://x.test/api/push/sweep', { headers: auth ? { authorization: auth } : {} }))

  it('is closed until it is configured', async () => {
    expect((await call('Bearer anything')).status).toBe(503)
  })

  it('answers only to the shared secret', async () => {
    vi.stubEnv('CRON_SECRET', 'correct-horse-battery')
    vi.stubEnv('FIRESTORE_REST_URL', 'http://emulator.test')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]'))) // an empty database
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect((await call('Bearer correct-horse-battery-and-more')).status).toBe(401)
    const ok = await call('Bearer correct-horse-battery')
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ people: 0, trips: 0, sent: 0, held: 0, removedDevices: 0, failures: 0 })
  })
})

describe('the record of what was sent', () => {
  it('has a fixed-size id whatever the reminder key holds', () => {
    expect(logId('next:item-1')).toMatch(/^[0-9a-f]{40}$/)
    expect(logId('next:item-1')).toBe(logId('next:item-1'))
    expect(logId('next:item-1')).not.toBe(logId('next:item-2'))
  })
})

describe('push-sw.js (the worker’s push handling)', () => {
  // The file is plain browser script (no module syntax), so it is evaluated the way a worker would, with `module` to read its functions.
  const sandbox = { exports: {} as Record<string, unknown> }
  new Function('module', readFileSync(path.resolve(__dirname, '../../public/push-sw.js'), 'utf8'))(sandbox)
  const { parsePush, safeLink } = sandbox.exports as {
    parsePush(e: { data?: { json(): unknown } }): { title: string; always: boolean; options: { body: string; tag?: string; data: { link: string } } }
    safeLink(l: unknown): string
  }
  const event = (payload: unknown) => ({ data: { json: () => payload } })

  it('reads the fields from Firebase’s wrapper or a bare message', () => {
    const wrapped = parsePush(event({ data: { title: 'Trip soon', body: 'Pack up', link: '/trips/t1', tag: 'k1' }, from: '123' }))
    expect(wrapped).toEqual({ title: 'Trip soon', always: false, options: { body: 'Pack up', tag: 'k1', data: { link: '/trips/t1' } } })
    expect(parsePush(event({ data: { title: 'Test', always: '1' } })).always).toBe(true) // the test button shows even when the app is open
    expect(parsePush(event({ title: 'Bare', body: 'b', link: '/live' })).title).toBe('Bare')
    expect(parsePush(event({ notification: { title: 'Shown by Firebase', body: 'x' } })).title).toBe('Shown by Firebase')
  })

  it('falls back to something sensible for a message with nothing usable in it', () => {
    expect(parsePush({}).title).toBe('Wayfarer')
    expect(parsePush({ data: { json: () => { throw new Error('not json') } } }).title).toBe('Wayfarer')
    expect(parsePush(event({ data: { title: 42, body: {} } })).options.body).toBe('')
  })

  it('only ever opens a page of this app', () => {
    expect(safeLink('/trips/t1/live')).toBe('/trips/t1/live')
    for (const bad of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '', undefined, 5]) expect(safeLink(bad)).toBe('/notifications')
  })

  it('limits how much text it will show', () => {
    expect(parsePush(event({ title: 'x'.repeat(500), body: 'y'.repeat(2000) })).title).toHaveLength(120)
    expect(parsePush(event({ title: 't', body: 'y'.repeat(2000) })).options.body).toHaveLength(300)
  })
})
