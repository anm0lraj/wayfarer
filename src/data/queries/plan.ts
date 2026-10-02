import { useQueries, useQuery } from '@tanstack/react-query'
import { bookingRepo, itineraryRepo } from '../repositories'
import { computePlanningProgress, type PlanningProgress } from '@/features/trips/planningProgress'
import type { Booking, ItineraryDay, ItineraryItem } from '@/types'

export interface TripPlan {
  days: ItineraryDay[]
  items: ItineraryItem[]
  bookings: Booking[]
  progress: PlanningProgress
}

/** Everything about a trip's plan in one read. Cached under ['trips', id, 'plan'] so any trip invalidation refreshes it. */
async function loadPlan(tripId: string): Promise<TripPlan> {
  const [days, items, bookings] = await Promise.all([itineraryRepo.listDays(tripId), itineraryRepo.listItems(tripId), bookingRepo.list(tripId)])
  return { days, items, bookings, progress: computePlanningProgress({ id: tripId }, days, items, bookings) }
}

const planKey = (tripId: string) => ['trips', tripId, 'plan'] as const

export function useTripPlan(tripId: string | undefined) {
  return useQuery({ queryKey: planKey(tripId ?? ''), enabled: !!tripId, queryFn: () => loadPlan(tripId!) })
}

/** Plans for several trips (Home, Trips list). Returns a map keyed by trip id once each has loaded. */
export function useTripPlans(tripIds: string[]): Record<string, TripPlan | undefined> {
  const results = useQueries({ queries: tripIds.map((id) => ({ queryKey: planKey(id), queryFn: () => loadPlan(id) })) })
  return Object.fromEntries(tripIds.map((id, i) => [id, results[i]?.data]))
}
