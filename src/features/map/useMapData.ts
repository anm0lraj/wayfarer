import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useTripPlaces } from '@/data/queries/catalog'
import { catalogRepo } from '@/data/repositories'
import { haversineKm } from '@/lib/geo'
import type { MapMarker } from '@/services/maps/types'
import type { Booking, GeoPoint, ItineraryItem, Place } from '@/types'

/** Where each item is, from its custom location or its catalog place. Items with neither have no entry. */
export function useItemPoints(items: ItineraryItem[]): Map<string, GeoPoint> {
  const placeIds = [...new Set(items.map((i) => i.placeId).filter((x): x is string => !!x))].sort()
  const places = useQuery({
    queryKey: ['places-by-id', placeIds.join(',')],
    enabled: placeIds.length > 0,
    staleTime: Infinity,
    queryFn: () => catalogRepo.getPlaces(placeIds),
  })
  return useMemo(() => {
    const byId = new Map((places.data ?? []).map((p) => [p.id, p.location]))
    const out = new Map<string, GeoPoint>()
    for (const i of items) {
      const point = i.customLocation?.point ?? (i.placeId ? byId.get(i.placeId) : undefined)
      if (point) out.set(i.id, point)
    }
    return out
  }, [items, places.data])
}

const markerKind = (i: ItineraryItem): MapMarker['kind'] =>
  i.category === 'food' ? 'restaurant' : i.category === 'transport' ? 'transport' : i.category === 'lodging' ? 'hotel' : i.category === 'activity' ? 'activity' : 'itinerary'

/** Numbered markers for one day's items (1, 2, 3…, counting only stops that have a location). */
export function dayMarkers(items: ItineraryItem[], points: Map<string, GeoPoint>): MapMarker[] {
  let n = 0
  return items.flatMap((item) => {
    const point = points.get(item.id)
    if (!point) return []
    n++
    return [{ id: item.id, point, label: String(n), kind: markerKind(item), ariaLabel: `Stop ${n}: ${item.title}` }]
  })
}

/** Hotels the user has added to the trip, as map pins. */
export function useHotelMarkers(bookings: Booking[]): MapMarker[] {
  const ids = [...new Set(bookings.filter((b) => b.type === 'hotel' && b.status !== 'cancelled' && b.refId).map((b) => b.refId!))]
  const hotels = useQueries({ queries: ids.map((id) => ({ queryKey: ['hotel', id], staleTime: Infinity, queryFn: () => catalogRepo.getHotel(id) })) })
  return hotels.flatMap((q) => (q.data ? [{ id: `hotel:${q.data.id}`, point: q.data.location, kind: 'hotel' as const, label: 'H', ariaLabel: `Hotel: ${q.data.name}` }] : []))
}

/** Catalog places near a point, closest first, for "Nearby search". */
export function useNearbyPlaces(center: GeoPoint | undefined, destinationIds: string[], excludePlaceIds: string[], radiusKm = 4) {
  const all = useTripPlaces(destinationIds)
  return useMemo(() => {
    if (!center) return [] as Array<Place & { distanceKm: number }>
    return (all.data ?? [])
      .filter((p) => !excludePlaceIds.includes(p.id) && p.kind !== 'airport')
      .map((p) => ({ ...p, distanceKm: Math.round(haversineKm(center, p.location) * 10) / 10 }))
      .filter((p) => p.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12)
    // exclude list is stable by content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.data, center?.lat, center?.lng, excludePlaceIds.join(','), radiusKm])
}

export const placeMarkerKind = (p: Place): MapMarker['kind'] => (p.kind === 'restaurant' ? 'restaurant' : p.kind === 'activity' ? 'activity' : 'attraction')
