import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@/app/providers/session'
import { toast } from '@/components/feedback/toast'
import { api, ApiError } from '@/lib/api'
import { db } from '../db'
import { likeRepo, publicTripRepo, savedRepo } from '../repositories'
import type { PublicTrip, Trip } from '@/types'

export const FEED_PAGE_SIZE = 6

interface Page { items: PublicTrip[]; nextCursor: string | null }
export interface FeedFilter { q?: string; destinationId?: string }

/** The Explore feed: cursor-paginated through the (mocked) backend, so it behaves like a real infinite list. */
export function usePublicFeed(filter: FeedFilter) {
  return useInfiniteQuery({
    queryKey: ['public-feed', filter.q ?? '', filter.destinationId ?? ''],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const p = new URLSearchParams({ limit: String(FEED_PAGE_SIZE) })
      if (pageParam) p.set('cursor', pageParam)
      if (filter.q) p.set('q', filter.q)
      if (filter.destinationId) p.set('destination', filter.destinationId)
      return api<Page>(`/api/explore/itineraries?${p}`, { signal })
    },
    getNextPageParam: (last) => last.nextCursor,
  })
}

/** One public itinerary by its URL slug. `null` means it doesn't exist (or was unpublished). */
export const usePublicTrip = (slug: string | undefined) =>
  useQuery({
    queryKey: ['public-trip', slug],
    enabled: !!slug,
    retry: false,
    queryFn: async ({ signal }) => {
      try {
        return await api<PublicTrip>(`/api/public-trips/${encodeURIComponent(slug!)}`, { signal })
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
  })

export const useSavedPublicIds = () => {
  const session = useSession()
  return useQuery({ queryKey: ['saved-public', session?.user.id], queryFn: async () => new Set(session ? (await savedRepo.list()).flatMap((s) => (s.publicTripId ? [s.publicTripId] : [])) : []) })
}

export const useLikedPublicIds = () => {
  const session = useSession()
  return useQuery({ queryKey: ['liked-public', session?.user.id], queryFn: async () => new Set(session ? (await likeRepo.list()).map((l) => l.publicTripId) : []) })
}

/** Saved itineraries, newest first, resolved to the public trips they point at. */
export const useSavedTrips = () =>
  useQuery({
    queryKey: ['saved-trips'],
    queryFn: async (): Promise<PublicTrip[]> => {
      const saved = (await savedRepo.list()).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      const trips = await db.publicTrips.bulkGet(saved.flatMap((s) => (s.publicTripId ? [s.publicTripId] : [])))
      return trips.filter((t): t is PublicTrip => !!t)
    },
  })

/**
 * Signed-out visitors can read public trips; the first time they try to save, like or copy we send them to
 * sign in and bring them straight back. Returns a wrapper: `gate(() => doTheThing())`.
 */
export function useSignInGate() {
  const session = useSession()
  const navigate = useNavigate()
  const loc = useLocation()
  return (action: () => void) => {
    if (session) return action()
    toast({ title: 'Sign in to continue', description: 'You can browse without an account; saving needs one.' })
    navigate('/signin', { state: { from: loc.pathname + loc.search } })
  }
}

function useInvalidatePublic() {
  const qc = useQueryClient()
  return () =>
    Promise.all(['public-feed', 'public-trip', 'saved-public', 'liked-public', 'saved-trips', 'public-trips', 'trips'].map((k) => qc.invalidateQueries({ queryKey: [k] })))
}

export function useToggleSavePublic() {
  const done = useInvalidatePublic()
  return useMutation({
    mutationFn: async ({ id, saved }: { id: string; saved: boolean }) => (saved ? savedRepo.unsave(id) : void (await savedRepo.save(id))),
    onSuccess: done,
    onError: () => toast({ title: 'Couldn’t update your saved trips' }),
  })
}

export function useToggleLikePublic() {
  const done = useInvalidatePublic()
  return useMutation({ mutationFn: (id: string) => likeRepo.toggle(id), onSuccess: done, onError: () => toast({ title: 'Couldn’t update your like' }) })
}

/** "Use This Itinerary": copies into a new trip of the signed-in user; the original is untouched. */
export function useCopyItinerary() {
  const done = useInvalidatePublic()
  return useMutation({
    mutationFn: ({ id, startDate, endDate }: { id: string; startDate: string; endDate: string }): Promise<Trip> => publicTripRepo.useItinerary(id, { startDate, endDate }),
    onSuccess: done,
  })
}

export function usePublishTrip(tripId: string) {
  const done = useInvalidatePublic()
  return {
    publish: useMutation({ mutationFn: (opts: Parameters<typeof publicTripRepo.publish>[1]) => publicTripRepo.publish(tripId, opts), onSuccess: done }),
    unpublish: useMutation({ mutationFn: () => publicTripRepo.unpublish(tripId), onSuccess: done }),
  }
}

/** Destinations that have at least one public itinerary, for the feed's filter chips. */
export const usePublicDestinationIds = () =>
  useQuery({
    queryKey: ['public-destinations'],
    staleTime: 60_000,
    queryFn: async () => [...new Set((await db.publicTrips.toArray()).filter((t) => (t.visibility ?? 'public') === 'public').flatMap((t) => t.destinationIds))],
  })
