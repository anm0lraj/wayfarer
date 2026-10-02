import { differenceInCalendarDays, format, parseISO } from 'date-fns'

/** Today's calendar date (YYYY-MM-DD) as seen in the given IANA timezone. */
export function dateInTimezone(now: Date, timeZone: string): string {
  // formatToParts rather than relying on a locale's date layout (ICU builds differ).
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from))
}

/** Inclusive number of days in a trip, e.g. 12–16 Oct → 5. */
export function tripLengthDays(startDate: string, endDate: string): number {
  return daysBetween(startDate, endDate) + 1
}

export function formatDateRange(startDate: string, endDate: string): string {
  const s = parseISO(startDate)
  const e = parseISO(endDate)
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${format(s, 'd')}–${format(e, 'd MMM')}`
  }
  return `${format(s, 'd MMM')} – ${format(e, 'd MMM')}`
}

export function addDays(date: string, days: number): string {
  const d = parseISO(date)
  d.setDate(d.getDate() + days)
  return format(d, 'yyyy-MM-dd')
}

export function countdownLabel(startDate: string, today: string): string {
  const n = daysBetween(today, startDate)
  if (n > 1) return `${n} days to go`
  if (n === 1) return 'Tomorrow'
  if (n === 0) return 'Starts today'
  return ''
}

/** Minutes the timezone is ahead of UTC at the given instant. */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - at.getTime()) / 60000
}

/** The instant (ISO, UTC) at which the wall clock in `timeZone` reads `date` `time` (HH:mm). */
export function zonedIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [hh, mm] = time.split(':').map(Number) as [number, number]
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  return new Date(guess - offsetMinutes(new Date(guess), timeZone) * 60000).toISOString()
}
