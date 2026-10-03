import { createHash } from 'node:crypto'
import { sendPush, type PushMessage } from './fcm.js'
import { TIMED_TYPES, buildReminders, dateInTimezone, daysBetween, effectiveState, placeName, sociableHour, type BookingFacts, type Candidate, type DayFacts, type ItemFacts, type NotificationType } from './rules.js'
import { createIfAbsent, deleteDocument, getDocument, listCollection, listDevices, tripsOf, type Doc } from './store.js'

export interface SweepResult { people: number; trips: number; sent: number; held: number; removedDevices: number; failures: number }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const validZone = (z: unknown): z is string => { try { return typeof z === 'string' && !!new Intl.DateTimeFormat('en-US', { timeZone: z }) } catch { return false } }
const POOL = 4

/** Id of the "already sent" record for a reminder (the reminder's key can contain characters ids should not). */
export const logId = (key: string) => createHash('sha256').update(key).digest('hex').slice(0, 40)

const deviceToken = (d: Doc) => { const t = str(d.data.token); return t && t.length >= 20 && t.length <= 4096 ? t : undefined }

/** Reminders for one person's trips that are due now, with the trip they belong to. */
async function dueFor(uid: string, now: Date): Promise<{ trips: number; candidates: Array<Candidate & { tripId: string }> }> {
  const out: Array<Candidate & { tripId: string }> = []
  let trips = 0
  for (const t of await tripsOf(uid)) {
    const d = t.data
    const startDate = str(d.startDate), endDate = str(d.endDate), timezone = str(d.timezone)
    if (!startDate || !endDate || !timezone || !ISO_DATE.test(startDate) || !ISO_DATE.test(endDate) || !validZone(timezone)) continue
    const facts = { id: t.id, place: placeName((d.destinationIds as string[] | undefined)?.[0]), startDate, endDate, timezone, state: str(d.state) ?? 'planning' }
    const state = effectiveState(facts, now)
    if (!['planning', 'ready', 'upcoming', 'active'].includes(state)) continue
    if (daysBetween(dateInTimezone(now, timezone), startDate) > 8) continue // nothing to say about a trip this far off
    trips++
    const [days, items, bookings] = await Promise.all([listCollection(`trips/${t.id}/days`), listCollection(`trips/${t.id}/items`), listCollection(`trips/${t.id}/bookings`)])
    const reminders = buildReminders({
      trip: facts, now,
      days: days.map((x) => ({ id: x.id, dayNumber: Number(x.data.dayNumber), date: String(x.data.date) }) satisfies DayFacts),
      items: items.map((x) => ({ id: x.id, dayId: String(x.data.dayId), startTime: String(x.data.startTime), durationMin: Number(x.data.durationMin), title: String(x.data.title), status: String(x.data.status), travelTimeFromPrevMin: typeof x.data.travelTimeFromPrevMin === 'number' ? x.data.travelTimeFromPrevMin : undefined }) satisfies ItemFacts),
      bookings: bookings.map((x) => ({ id: x.id, type: String(x.data.type), status: String(x.data.status), title: String(x.data.title), startAt: String(x.data.startAt) }) satisfies BookingFacts),
    })
    out.push(...reminders.map((r) => ({ ...r, tripId: t.id })))
  }
  return { trips, candidates: out }
}

const message = (c: Candidate): PushMessage => ({ title: c.title, body: c.body, link: c.deepLink, tag: c.key })

/**
 * One pass over everyone who has a registered device: work out which reminders are due, skip the ones switched off in
 * Settings or already sent, and push the rest. Each reminder is recorded in `users/{uid}/pushLog` *before* sending
 * (create-if-absent), so two overlapping sweeps cannot both send it; if Google is unreachable the record is removed so
 * the next sweep tries again. Devices Google reports as unregistered are deleted.
 */
export async function runSweep(now = new Date(), budgetMs = 45_000): Promise<SweepResult> {
  const result: SweepResult = { people: 0, trips: 0, sent: 0, held: 0, removedDevices: 0, failures: 0 }
  const byPerson = new Map<string, Doc[]>()
  for (const d of await listDevices()) {
    const uid = d.path.split('/')[1]
    if (uid && deviceToken(d)) byPerson.set(uid, [...(byPerson.get(uid) ?? []), d])
  }
  const deadline = Date.now() + budgetMs
  const queue = [...byPerson.entries()]

  const person = async ([uid, devices]: [string, Doc[]]) => {
    result.people++
    const prefs = ((await getDocument(`users/${uid}`))?.data.settings as { notificationPrefs?: Record<string, boolean> } | undefined)?.notificationPrefs ?? {}
    const { trips, candidates } = await dueFor(uid, now)
    result.trips += trips
    const zone = devices.map((d) => d.data.tz).find(validZone) ?? 'Asia/Kolkata'
    for (const c of candidates) {
      if (prefs[c.type as NotificationType] === false) continue
      if (!TIMED_TYPES.has(c.type) && !sociableHour(now, zone)) { result.held++; continue } // sent at the next sweep after 08:00 instead
      const id = logId(c.key)
      if (!(await createIfAbsent(`users/${uid}/pushLog`, id, { key: c.key, tripId: c.tripId, sentAt: now.toISOString() }))) continue
      const outcomes = await Promise.all(devices.map(async (d) => ({ d, r: await sendPush(deviceToken(d)!, message(c)) })))
      for (const { d, r } of outcomes) if (r === 'gone') { await deleteDocument(d.path); result.removedDevices++ }
      if (outcomes.some((o) => o.r === 'sent')) result.sent++
      else if (outcomes.some((o) => o.r === 'retry')) { await deleteDocument(`users/${uid}/pushLog/${id}`); result.failures++ } // try again next sweep
    }
  }

  await Promise.all(Array.from({ length: POOL }, async () => {
    for (let next = queue.shift(); next && Date.now() < deadline; next = queue.shift()) {
      try { await person(next) } catch (e) { result.failures++; console.error('Push sweep failed for one person', e instanceof Error ? e.message : e) }
    }
  }))
  return result
}

/** Sends a test notification to every device a person has registered. At most one a minute. */
export async function sendTest(uid: string, now = new Date()): Promise<{ devices: number; sent: number } | 'too_soon'> {
  const fresh = await createIfAbsent(`users/${uid}/pushLog`, `test_${Math.floor(now.getTime() / 60_000)}`, { key: 'test', sentAt: now.toISOString() })
  if (!fresh) return 'too_soon'
  const devices = (await listCollection(`users/${uid}/devices`)).filter((d) => deviceToken(d))
  let sent = 0
  for (const d of devices) {
    const r = await sendPush(deviceToken(d)!, { title: 'Reminders are on', body: 'This is a test. Wayfarer will nudge you like this about your trips.', link: '/settings#notifications', tag: 'wayfarer-test', always: true })
    if (r === 'sent') sent++
    else if (r === 'gone') await deleteDocument(d.path)
  }
  return { devices: devices.length, sent }
}
