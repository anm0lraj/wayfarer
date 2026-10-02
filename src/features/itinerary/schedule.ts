import type { ItineraryItem } from '@/types'

export const toMinutes = (hhmm: string): number => {
  const [h = '0', m = '0'] = hhmm.split(':')
  return Number(h) * 60 + Number(m)
}

export const fromMinutes = (total: number): string => {
  const t = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export const endTime = (item: Pick<ItineraryItem, 'startTime' | 'durationMin'>): string => fromMinutes(toMinutes(item.startTime) + item.durationMin)

export interface ScheduleWarning {
  /** The later of the two items involved; the warning is shown above it. */
  itemId: string
  kind: 'tight' | 'overlap' | 'order'
  message: string
}

/** Warnings about unrealistic timing between consecutive stops (spec §11). Items must be in day order. */
export function scheduleWarnings(items: ItineraryItem[]): ScheduleWarning[] {
  const out: ScheduleWarning[] = []
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]!
    const cur = items[i]!
    const prevStart = toMinutes(prev.startTime)
    const curStart = toMinutes(cur.startTime)
    const gap = curStart - (prevStart + prev.durationMin)
    const travel = cur.travelTimeFromPrevMin ?? 0
    if (curStart < prevStart) {
      out.push({ itemId: cur.id, kind: 'order', message: `“${cur.title}” is scheduled before “${prev.title}” but listed after it.` })
    } else if (gap < 0) {
      out.push({ itemId: cur.id, kind: 'overlap', message: `“${cur.title}” starts ${-gap} minutes before “${prev.title}” ends.` })
    } else if (travel > gap) {
      out.push({
        itemId: cur.id, kind: 'tight',
        message: `This schedule gives you only ${gap} minutes to travel between these locations. Recommended travel time: ${travel} minutes.`,
      })
    }
  }
  return out
}

export interface DayLoad {
  count: number
  /** Time spent at stops plus travelling, in minutes. */
  busyMinutes: number
  busy: boolean
}

/** A day is "busy" with 7+ stops or more than 11 hours of activity and travel. */
export function dayLoad(items: ItineraryItem[]): DayLoad {
  const busyMinutes = items.reduce((sum, i) => sum + i.durationMin + (i.travelTimeFromPrevMin ?? 0), 0)
  return { count: items.length, busyMinutes, busy: items.length >= 7 || busyMinutes > 11 * 60 }
}

/**
 * New start times that make a day realistic: the first stop keeps its time, each next one starts after the
 * previous ends plus travel (at least `minGapMin`), rounded up to 5 minutes.
 */
export function retime(items: ItineraryItem[], minGapMin = 10): Array<{ id: string; startTime: string }> {
  const out: Array<{ id: string; startTime: string }> = []
  let cursor = items[0] ? toMinutes(items[0].startTime) : 0
  items.forEach((item, i) => {
    if (i > 0) {
      const wait = Math.max(item.travelTimeFromPrevMin ?? 0, minGapMin)
      cursor = Math.ceil((cursor + wait) / 5) * 5
    }
    out.push({ id: item.id, startTime: fromMinutes(cursor) })
    cursor += item.durationMin
  })
  return out
}

/** A sensible start time for something added to the end of a day. */
export function suggestNextStart(items: ItineraryItem[], travelMin = 15): string {
  const last = items[items.length - 1]
  if (!last) return '10:00'
  return fromMinutes(Math.ceil((toMinutes(last.startTime) + last.durationMin + travelMin) / 5) * 5)
}
