import type { Booking, ItineraryDay, ItineraryItem, Trip } from '@/types'

export interface PlanningTask {
  id: string
  label: string
  /** App route that resolves the task. */
  to: string
}

export interface PlanningProgress {
  percent: number
  tasks: PlanningTask[]
}

/** A day counts as planned once it has this many activities. */
export const PLANNED_DAY_MIN_ITEMS = 3

/**
 * How complete a trip's plan is, and what to do next. Weights: itinerary days 50%, accommodation 25%,
 * flights 25%. A "saved" demo booking counts as added — it is a plan entry, not a real reservation.
 */
export function computePlanningProgress(
  trip: Pick<Trip, 'id'>,
  days: ItineraryDay[],
  items: ItineraryItem[],
  bookings: Booking[],
): PlanningProgress {
  const live = bookings.filter((b) => b.status !== 'cancelled')
  const hasHotel = live.some((b) => b.type === 'hotel')
  const hasFlight = live.some((b) => b.type === 'flight')
  const countByDay = new Map<string, number>()
  for (const i of items) countByDay.set(i.dayId, (countByDay.get(i.dayId) ?? 0) + 1)

  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  const planned = sorted.filter((d) => (countByDay.get(d.id) ?? 0) >= PLANNED_DAY_MIN_ITEMS)
  const dayFraction = sorted.length ? planned.length / sorted.length : 0
  const percent = Math.round(50 * dayFraction + (hasHotel ? 25 : 0) + (hasFlight ? 25 : 0))

  const base = `/trips/${trip.id}`
  const tasks: PlanningTask[] = []
  const empty = sorted.filter((d) => !countByDay.get(d.id))
  if (sorted.length && empty.length === sorted.length) {
    tasks.push({ id: 'activities', label: 'Add activities', to: `${base}/itinerary/day/1` })
  } else {
    for (const d of sorted.filter((d) => (countByDay.get(d.id) ?? 0) < PLANNED_DAY_MIN_ITEMS).slice(0, 2)) {
      tasks.push({ id: `day-${d.dayNumber}`, label: `Complete Day ${d.dayNumber}`, to: `${base}/itinerary/day/${d.dayNumber}` })
    }
  }
  if (!hasHotel) tasks.push({ id: 'hotel', label: 'Add accommodation', to: `${base}/bookings/hotels` })
  if (!hasFlight) tasks.push({ id: 'flight', label: 'Add flights', to: `${base}/bookings/flights` })
  if (sorted.length && planned.length === sorted.length) tasks.push({ id: 'route', label: 'Review route', to: `${base}/map` })
  return { percent, tasks }
}
