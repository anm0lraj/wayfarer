import { useQuery } from '@tanstack/react-query'
import { db } from '../db'
import { memoryRepo } from '../repositories'
import { api } from '@/lib/api'
import type { Memory, PublicTrip } from '@/types'

interface PublicTripPage {
  items: PublicTrip[]
  nextCursor: string | null
}

/** Public itineraries from other travellers, via the (mocked) backend feed endpoint. */
export const usePublicTrips = (limit = 12) =>
  useQuery({ queryKey: ['public-trips', limit], queryFn: ({ signal }) => api<PublicTripPage>(`/api/explore/itineraries?limit=${limit}`, { signal }).then((p) => p.items) })

/** Most recent memories across all of the signed-in user's trips. */
export const useRecentMemories = (limit = 8) =>
  useQuery({
    queryKey: ['memories', 'recent', limit],
    queryFn: async (): Promise<Memory[]> => {
      const trips = await db.trips.toArray()
      const lists = await Promise.all(trips.map((t) => memoryRepo.list(t.id).catch(() => [] as Memory[])))
      return lists.flat().filter((m) => m.kind === 'photo' && m.mediaKey).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, limit)
    },
  })
