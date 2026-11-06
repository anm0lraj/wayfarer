import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/services'
import type { GeoPoint } from '@/types'

export const MIN_SEARCH_CHARS = 3
export const SEARCH_DEBOUNCE_MS = 350
const FIVE_MINUTES = 5 * 60_000

/**
 * Place search for the location picker. Pass the text after debouncing: it only runs from 3 characters, answers are
 * kept for 5 minutes (typing the same thing again costs no request), a failure is shown rather than retried (the
 * public geocoder allows one request a second), and it never runs while offline (cached answers still show).
 */
export function useGeocodeSearch(query: string, near: GeoPoint | undefined, online = true) {
  const { geocoding } = useServices()
  const q = query.trim()
  // Rounded to ~11 km so a small pan of the trip centre doesn't miss the cache.
  const area = near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : ''
  return useQuery({
    queryKey: ['geocode', q.toLowerCase(), area],
    enabled: online && q.length >= MIN_SEARCH_CHARS,
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES,
    retry: false,
    queryFn: ({ signal }) => geocoding.search(q, near, signal),
  })
}
