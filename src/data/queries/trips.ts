import { useQuery } from '@tanstack/react-query'
import { tripRepo } from '../repositories'
import { computeTripState } from '@/features/trips/tripState'
import { useClockStore } from '@/services/clock/clock'
import { clock } from '@/services/clock/clock'
import type { Trip, TripState } from '@/types'

export const queryKeys = {
  trips: ['trips'] as const,
  trip: (id: string) => ['trips', id] as const,
  session: ['session'] as const,
}

export type TripWithState = Trip & { effectiveState: TripState }

const withState = (t: Trip): TripWithState => ({ ...t, effectiveState: computeTripState(t, clock.now()) })

/** The user's trips with their effective (date-derived) state. Re-derived when the demo clock changes. */
export function useTrips() {
  const simulated = useClockStore((s) => s.simulatedNow)
  return useQuery({
    queryKey: [...queryKeys.trips, simulated],
    queryFn: async () => (await tripRepo.list()).map(withState),
  })
}

export function useTrip(id: string | undefined) {
  const simulated = useClockStore((s) => s.simulatedNow)
  return useQuery({
    queryKey: [...queryKeys.trip(id ?? ''), simulated],
    enabled: !!id,
    queryFn: async () => {
      const t = await tripRepo.get(id!)
      return t ? withState(t) : null
    },
  })
}

/** The trip happening right now, if any — drives the Live Trip nav entry. */
export function useActiveTrip(): TripWithState | undefined {
  return useTrips().data?.find((t) => t.effectiveState === 'active')
}
