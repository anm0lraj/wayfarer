import { itemWindow } from '@/features/live-trip/liveStatus'
import { dateInTimezone, zonedIso } from '@/lib/dates'
import type { ItineraryDay, ItineraryItem } from '@/types'

/** The instant a camera-local `date` + `time` happened, given the trip's timezone (EXIF has no zone). */
export const capturedIso = (taken: { date: string; time: string }, timeZone: string) => zonedIso(taken.date, taken.time, timeZone)

/**
 * Which day and activity a memory belongs to, from when it was captured.
 * Day: the one with the same calendar date in the trip's timezone. Activity: the one running at that moment,
 * otherwise the most recent one that started before it that day. Outside the trip's days → nothing.
 */
export function attachToPlan(
  capturedAt: string, timeZone: string, days: ItineraryDay[], items: ItineraryItem[],
): { dayId?: string; itemId?: string } {
  const date = dateInTimezone(new Date(capturedAt), timeZone)
  const day = days.find((d) => d.date === date)
  if (!day) return {}
  const t = Date.parse(capturedAt)
  const windows = items
    .filter((i) => i.dayId === day.id)
    .map((item) => ({ item, ...itemWindow(item, day.date, timeZone) }))
    .sort((a, b) => a.start - b.start)
  const running = windows.find((w) => t >= w.start && t < w.end)
  const before = [...windows].reverse().find((w) => w.start <= t)
  return { dayId: day.id, itemId: (running ?? before)?.item.id }
}
