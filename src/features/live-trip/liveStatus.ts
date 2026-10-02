import { zonedIso } from '@/lib/dates'
import { haversineKm } from '@/lib/geo'
import type { GeoPoint, ItineraryItem, ItemStatus } from '@/types'

/** One of today's activities with its real time window and the status the UI should show. */
export interface LiveItem {
  item: ItineraryItem
  /** Epoch ms of the start / end in the trip's timezone. */
  start: number
  end: number
  status: ItemStatus
  /** True when `status` was inferred from the clock rather than set by the traveller. */
  auto: boolean
  /** Still marked "upcoming" although its time has passed — needs a decision (done or skipped). */
  overdue: boolean
}

export function itemWindow(item: Pick<ItineraryItem, 'startTime' | 'durationMin'>, date: string, timeZone: string) {
  const start = Date.parse(zonedIso(date, item.startTime, timeZone))
  return { start, end: start + item.durationMin * 60_000 }
}

/**
 * Status from the stored value plus the clock. A traveller's own choice always wins; only an untouched
 * "upcoming" item is inferred as "in progress" while its time window is running. We never infer
 * "completed" — an item whose time has passed is flagged `overdue` and left for the traveller to confirm.
 */
export function liveItems(items: ItineraryItem[], date: string, timeZone: string, now: Date): LiveItem[] {
  const t = now.getTime()
  return items.map((item) => {
    const { start, end } = itemWindow(item, date, timeZone)
    if (item.status !== 'upcoming') return { item, start, end, status: item.status, auto: false, overdue: false }
    if (t >= start && t < end) return { item, start, end, status: 'in_progress', auto: true, overdue: false }
    return { item, start, end, status: 'upcoming', auto: false, overdue: t >= end }
  })
}

export interface LiveSnapshot {
  current?: LiveItem
  next?: LiveItem
  /** Not completed or skipped, in itinerary order (includes current, next and overdue). */
  remaining: LiveItem[]
  done: LiveItem[]
  overdue: LiveItem[]
}

export function liveSnapshot(list: LiveItem[]): LiveSnapshot {
  const done = list.filter((l) => l.status === 'completed' || l.status === 'skipped')
  const remaining = list.filter((l) => !done.includes(l))
  const current = remaining.find((l) => l.status === 'in_progress')
  const overdue = remaining.filter((l) => l.overdue)
  const next = remaining.find((l) => l !== current && !l.overdue)
  return { current, next, remaining, done, overdue }
}

/** Hour of day (0–23) in the given timezone. */
export function hourInZone(now: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).find((p) => p.type === 'hour')?.value
  return Number(h)
}

export function greetingFor(now: Date, timeZone: string): string {
  const h = hourInZone(now, timeZone)
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** "09:00" → "9:00 AM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** Minutes from `now` until `ms` (rounded up, never negative). */
export const minutesUntil = (ms: number, now: Date) => Math.max(0, Math.ceil((ms - now.getTime()) / 60_000))

export function humanMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Within roughly walking distance of a stop. */
export const ARRIVED_KM = 0.15
export const isNear = (here: GeoPoint, target: GeoPoint, thresholdKm = ARRIVED_KM) => haversineKm(here, target) <= thresholdKm

export const STATUS_LABEL: Record<ItemStatus, string> = {
  upcoming: 'Upcoming', on_the_way: 'On the way', in_progress: 'In progress', completed: 'Completed', skipped: 'Skipped',
}
