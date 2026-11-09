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

const HALF_DAY_MS = 12 * 3_600_000

/**
 * The instant (ISO, UTC) at which the wall clock in `timeZone` reads `date` `time` (HH:mm). On a daylight-saving change a
 * time in the repeated hour gives its first occurrence, and a time in the skipped hour is moved forward by the gap.
 */
export function zonedIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [hh, mm] = time.split(':').map(Number) as [number, number]
  const wall = Date.UTC(y, m - 1, d, hh, mm) // the wall-clock reading, as if it were UTC
  // The offset in force can differ either side of a daylight-saving change, so try the offsets from half a day before and
  // after: an offset is right when the instant it gives really has that offset. Two right answers = the repeated hour
  // (clocks went back): take the first. None = the skipped hour (clocks went forward): read it with the offset from before
  // the change, i.e. move it forward by the gap (02:30 → 03:30), as Temporal's 'compatible' does.
  const before = offsetMinutes(new Date(wall - HALF_DAY_MS), timeZone)
  const after = offsetMinutes(new Date(wall + HALF_DAY_MS), timeZone)
  const valid = [...new Set([before, after])].map((o) => wall - o * 60000).filter((t) => wall - offsetMinutes(new Date(t), timeZone) * 60000 === t)
  const instant = valid.length ? Math.min(...valid) : wall - before * 60000
  return new Date(instant).toISOString()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * An ISO datetime as its own wall clock, named by the offset it was written with, e.g.
 * `2026-10-13T10:00:00+08:00` → `13 Oct 2026, 10:00 (UTC+08:00)`. Unlike `format(new Date(iso))` it does not move the
 * time into the browser's timezone. Without an offset the time is shown as written, unnamed.
 */
export function wallClockLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(iso)
  if (!m) return iso
  const [, y, mo, d, hh, mm, offset] = m as unknown as [string, string, string, string, string, string, string | undefined]
  const label = `${Number(d)} ${MONTHS[Number(mo) - 1] ?? mo} ${y}, ${hh}:${mm}`
  if (!offset) return label
  const zone = offset.toUpperCase() === 'Z' ? '+00:00' : offset.includes(':') ? offset : `${offset.slice(0, 3)}:${offset.slice(3)}`
  return `${label} (UTC${zone})`
}
