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
