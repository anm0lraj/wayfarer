/**
 * Which reminders a trip needs right now. This is a deliberate copy of `src/features/notifications/rules.ts` (Vercel
 * functions cannot import the app's source), so the app and the server say the same thing; `src/server/push.test.ts`
 * runs both on the same trips and fails if they ever differ. The weather alert is app-only for now (it needs a forecast
 * fetch per trip), so it is left out of the comparison.
 */
export type NotificationType = 'trip_countdown' | 'checkin_reminder' | 'weather_alert' | 'next_activity' | 'free_time' | 'busy_day'

export interface Candidate { key: string; type: NotificationType; title: string; body: string; deepLink: string }

export interface TripFacts { id: string; place: string; startDate: string; endDate: string; timezone: string; state: string }
export interface DayFacts { id: string; dayNumber: number; date: string }
export interface ItemFacts { id: string; dayId: string; startTime: string; durationMin: number; title: string; status: string; travelTimeFromPrevMin?: number }
export interface BookingFacts { id: string; type: string; status: string; title: string; startAt: string }

export interface RuleInput { trip: TripFacts; days: DayFacts[]; items: ItemFacts[]; bookings: BookingFacts[]; now: Date }

const DAY_MS = 86_400_000
const toUtc = (d: string) => { const [y, m, day] = d.split('-').map(Number) as [number, number, number]; return Date.UTC(y, m - 1, day) }

export function dateInTimezone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
export const addDays = (date: string, n: number) => new Date(toUtc(date) + n * DAY_MS).toISOString().slice(0, 10)

function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - at.getTime()) / 60000
}
/** The instant at which the wall clock in `timeZone` reads `date` `time` (HH:mm). */
export function zonedMs(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [hh, mm] = time.split(':').map(Number) as [number, number]
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  return guess - offsetMinutes(new Date(guess), timeZone) * 60000
}

/** `computeTripState` from the app: stored draft/archived are final, the rest follows the dates in the trip's timezone. */
export function effectiveState(trip: Pick<TripFacts, 'state' | 'startDate' | 'endDate' | 'timezone'>, now: Date): string {
  if (trip.state === 'archived') return 'archived'
  const today = dateInTimezone(now, trip.timezone)
  if (today > trip.endDate) return 'completed'
  if (today >= trip.startDate) return 'active'
  if (trip.state === 'ready' && daysBetween(today, trip.startDate) <= 14) return 'upcoming'
  return trip.state
}

const busy = (items: ItemFacts[]) => items.length >= 7 || items.reduce((s, i) => s + i.durationMin + (i.travelTimeFromPrevMin ?? 0), 0) > 11 * 60
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const FREE_TIME_MIN = 120
const SOON_MIN = 30

export function buildReminders({ trip, days, items, bookings, now }: RuleInput): Candidate[] {
  const state = effectiveState(trip, now)
  if (state === 'completed' || state === 'archived' || state === 'draft') return []
  const out: Candidate[] = []
  const today = dateInTimezone(now, trip.timezone)
  const base = `/trips/${trip.id}`
  const untilStart = daysBetween(today, trip.startDate)

  if (untilStart === 7 || untilStart === 1) {
    out.push({
      key: `countdown:${trip.id}:${untilStart}`, type: 'trip_countdown', deepLink: untilStart === 7 ? `${base}/checklist` : base,
      title: untilStart === 7 ? `Your ${trip.place} trip starts in 7 days.` : `Your ${trip.place} trip starts tomorrow.`,
      body: untilStart === 7 ? 'Time to check your documents, bookings and packing.' : 'Last check: passport, bookings and charged phone.',
    })
  }

  for (const b of bookings) {
    if (b.type !== 'hotel' || b.status === 'cancelled') continue
    if (daysBetween(today, dateInTimezone(new Date(b.startAt), trip.timezone)) === 1) {
      out.push({ key: `checkin:${b.id}`, type: 'checkin_reminder', deepLink: `${base}/bookings`, title: 'Your hotel check-in is tomorrow.', body: `${b.title}. This is a saved plan — confirm with the property.` })
    }
  }

  const todayDay = days.find((d) => d.date === today)
  const tomorrowDay = days.find((d) => d.date === addDays(today, 1))
  for (const day of [todayDay, tomorrowDay]) {
    if (!day) continue
    const dayItems = items.filter((i) => i.dayId === day.id)
    if (busy(dayItems)) {
      out.push({
        key: `busy:${day.id}`, type: 'busy_day', deepLink: `${base}/itinerary/day/${day.dayNumber}`,
        title: `Your Day ${day.dayNumber} itinerary may be too busy.`, body: `${plural(dayItems.length, 'stop')} planned. Want to trim it?`,
      })
    }
  }

  if (state === 'active' && todayDay) {
    const live = items.filter((i) => i.dayId === todayDay.id).map((item) => {
      const start = zonedMs(todayDay.date, item.startTime, trip.timezone)
      return { item, start, end: start + item.durationMin * 60_000 }
    })
    const t = now.getTime()
    const open = live.filter((l) => l.item.status === 'upcoming' && l.end > t).sort((a, b) => a.start - b.start)
    const next = open.find((l) => l.start > t)
    const running = live.some((l) => l.item.status === 'in_progress' || (l.item.status === 'upcoming' && l.start <= t && t < l.end))
    if (next) {
      const minutes = Math.ceil((next.start - t) / 60_000)
      if (minutes <= SOON_MIN) {
        out.push({ key: `next:${next.item.id}`, type: 'next_activity', deepLink: `${base}/live`, title: `Your next activity starts in ${plural(minutes, 'minute')}.`, body: next.item.title })
      } else if (!running && minutes >= FREE_TIME_MIN) {
        out.push({ key: `free:${trip.id}:${today}`, type: 'free_time', deepLink: `${base}/live`, title: `You have ${Math.floor(minutes / 60)} unplanned hours today.`, body: `Nothing until ${next.item.title}. Want ideas for what to do nearby?` })
      }
    }
  }
  return out
}

/** Reminders that are only worth a buzz at a sociable hour. Starting an activity in 30 minutes is sent whenever it happens. */
export const TIMED_TYPES = new Set<NotificationType>(['next_activity'])
export const QUIET = { from: 8, to: 21 }

/** Is it a sociable hour (08:00–21:00) in the person's timezone? */
export function sociableHour(now: Date, timeZone: string): boolean {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now))
  return h >= QUIET.from && h < QUIET.to
}

/** "bali" → "Bali": destination ids in this app are the lowercase place name (the catalogue is not stored on the server). */
export const placeName = (destinationId: string | undefined) =>
  destinationId ? destinationId.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : 'your'
