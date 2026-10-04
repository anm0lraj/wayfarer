import { useQuery } from '@tanstack/react-query'
import { db } from '../db'
import { memoryRepo } from '../repositories'
import { env } from '@/config/env'
import { api } from '@/lib/api'
import type { Memory, PublicTrip } from '@/types'

interface PublicTripPage {
  items: PublicTrip[]
  nextCursor: string | null
}

const live = env.backend === 'firebase'

/**
 * Public itineraries from other travellers, for the "Inspiration" rows on Home and Explore. They must come from the same
 * place as the full feed behind "See all": the server on the real backend (the in-page demo endpoint reads this device's
 * leftovers, which led to rows of trips that then opened to nothing), the demo endpoint otherwise. If the server cannot be
 * reached, the public pages this device has already seen stand in, so the row is not blank offline.
 */
export const usePublicTrips = (limit = 12) =>
  useQuery({
    queryKey: ['public-trips', limit],
    queryFn: async ({ signal }) => {
      if (!live) return api<PublicTripPage>(`/api/explore/itineraries?limit=${limit}`, { signal }).then((p) => p.items)
      try {
        const page = await (await import('../remote/publicTrips')).listPublicPage(null, limit)
        await db.publicTrips.bulkPut(page.items) // the feed's own cache (see usePublicFeed): lets save, like and copy find them by id
        return page.items
      } catch (e) {
        const seen = (await db.publicTrips.toArray()).filter((t) => t.visibility === 'public').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit)
        if (seen.length) return seen
        throw e
      }
    },
  })

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
