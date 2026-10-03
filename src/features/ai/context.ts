import type { TripPlan } from '@/data/queries/plan'
import { currentDayNumber } from '@/features/trips/tripState'
import { dateInTimezone, tripLengthDays } from '@/lib/dates'
import type { TripContext } from '@/services/ai/types'
import type { Destination, Trip } from '@/types'

/**
 * What the assistant knows about the trip, so the user never has to repeat it: dates, travellers, budget,
 * hotel, where they are in the trip and what's done or coming up. Sent to the backend proxy with each message.
 */
export function buildTripContext(trip: Trip, plan: TripPlan | undefined, destination: Destination | undefined, now: Date): TripContext {
  const currentDay = currentDayNumber(trip, now) ?? undefined
  const focusDay = currentDay ?? 1
  const days = plan?.days ?? []
  const dayNumber = new Map(days.map((d) => [d.id, d.dayNumber]))
  const items = plan?.items ?? []
  const focusDayId = days.find((d) => d.dayNumber === focusDay)?.id
  const todays = items.filter((i) => i.dayId === focusDayId).sort((a, b) => a.position - b.position)
  const hotel = plan?.bookings.find((b) => b.type === 'hotel' && b.status !== 'cancelled')
  const upcomingPool = currentDay ? todays.filter((i) => i.status !== 'completed' && i.status !== 'skipped') : todays
  return {
    trip: { id: trip.id, title: trip.title, startDate: trip.startDate, endDate: trip.endDate, travellers: trip.travellers, budget: trip.budget, interests: trip.interests },
    destination: destination ? { id: destination.id, name: destination.name } : undefined,
    hotelName: hotel?.title,
    today: dateInTimezone(now, trip.timezone),
    days: tripLengthDays(trip.startDate, trip.endDate),
    currentDay,
    focusDay,
    completed: items.filter((i) => i.status === 'completed' && (dayNumber.get(i.dayId) ?? 0) <= focusDay).map((i) => i.title).slice(-5),
    upcoming: upcomingPool.slice(0, 3).map((i) => i.title),
    plan: days.map((d) => ({ dayNumber: d.dayNumber, items: items.filter((i) => i.dayId === d.id).sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, title: i.title, startTime: i.startTime, durationMin: i.durationMin })) })),
    items: todays.map((i) => ({ id: i.id, title: i.title, startTime: i.startTime, dayId: i.dayId, placeId: i.placeId })),
  }
}
