import type { GeoPoint } from '@/types'

/**
 * Cities the demo timetable and the local-transport estimates know about. Static and bundled — not seeded into
 * IndexedDB. Ids match destination ids where a destination exists (`bali`, `goa`, `japan`…), so a trip's first
 * destination finds its city directly.
 */
export interface TransitCity {
  id: string
  name: string
  /** ISO country code: picks the fare table when a city has none of its own. */
  country: 'IN' | 'ID' | 'JP' | 'FR'
  centre: GeoPoint
  /** Minutes east of UTC. The timetable stamps each stop's own offset on its times, like flights. */
  utcOffsetMin: number
  /** The city a trip to this one usually starts from; the search's default "From". */
  startsFrom: string
}

export const TRANSIT_CITIES: TransitCity[] = [
  { id: 'delhi', name: 'Delhi', country: 'IN', centre: { lat: 28.6139, lng: 77.209 }, utcOffsetMin: 330, startsFrom: 'mumbai' },
  { id: 'jaipur', name: 'Jaipur', country: 'IN', centre: { lat: 26.9124, lng: 75.7873 }, utcOffsetMin: 330, startsFrom: 'delhi' },
  { id: 'udaipur', name: 'Udaipur', country: 'IN', centre: { lat: 24.5854, lng: 73.7125 }, utcOffsetMin: 330, startsFrom: 'jaipur' },
  { id: 'jodhpur', name: 'Jodhpur', country: 'IN', centre: { lat: 26.2389, lng: 73.0243 }, utcOffsetMin: 330, startsFrom: 'jaipur' },
  { id: 'goa', name: 'Goa', country: 'IN', centre: { lat: 15.2993, lng: 74.124 }, utcOffsetMin: 330, startsFrom: 'mumbai' },
  { id: 'mumbai', name: 'Mumbai', country: 'IN', centre: { lat: 19.076, lng: 72.8777 }, utcOffsetMin: 330, startsFrom: 'delhi' },
  { id: 'manali', name: 'Manali', country: 'IN', centre: { lat: 32.2396, lng: 77.1887 }, utcOffsetMin: 330, startsFrom: 'delhi' },
  { id: 'bali', name: 'Bali', country: 'ID', centre: { lat: -8.4095, lng: 115.1889 }, utcOffsetMin: 480, startsFrom: 'surabaya' },
  { id: 'surabaya', name: 'Surabaya', country: 'ID', centre: { lat: -7.2575, lng: 112.7521 }, utcOffsetMin: 420, startsFrom: 'bali' },
  { id: 'yogyakarta', name: 'Yogyakarta', country: 'ID', centre: { lat: -7.7956, lng: 110.3695 }, utcOffsetMin: 420, startsFrom: 'surabaya' },
  // No timetable rows: they exist so local fares and "too far" messages work for these destinations.
  { id: 'japan', name: 'Tokyo', country: 'JP', centre: { lat: 35.6762, lng: 139.6503 }, utcOffsetMin: 540, startsFrom: 'mumbai' },
  { id: 'paris', name: 'Paris', country: 'FR', centre: { lat: 48.8566, lng: 2.3522 }, utcOffsetMin: 120, startsFrom: 'mumbai' },
]

const BY_ID = new Map(TRANSIT_CITIES.map((c) => [c.id, c]))

export const transitCity = (id: string | undefined): TransitCity | undefined => (id ? BY_ID.get(id) : undefined)
export const cityName = (id: string): string => BY_ID.get(id)?.name ?? id
