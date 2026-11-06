import { haversineKm } from '@/lib/geo'
import type { GeoPoint } from '@/types'
import type { GeocodeResult, GeocodingService } from './types'

/** A small fixed catalogue so the picker works in the demo and in tests. `area` holds extra words people may type. */
const PLACES: Array<GeocodeResult & { area: string }> = [
  { id: 'mock:warung-babi-guling', name: 'Warung Babi Guling Ibu Oka', address: 'Jl. Suweta, Ubud, Bali, Indonesia', area: 'bali ubud', point: { lat: -8.5069, lng: 115.2625 } },
  { id: 'mock:tegallalang', name: 'Tegallalang Rice Terrace', address: 'Tegallalang, Gianyar, Bali, Indonesia', area: 'bali gianyar', point: { lat: -8.4312, lng: 115.2796 } },
  { id: 'mock:single-fin', name: 'Single Fin Uluwatu', address: 'Jl. Labuansait, Pecatu, Bali, Indonesia', area: 'bali uluwatu', point: { lat: -8.8147, lng: 115.0883 } },
  { id: 'mock:petitenget', name: 'Petitenget Beach', address: 'Jl. Petitenget, Seminyak, Bali, Indonesia', area: 'bali seminyak', point: { lat: -8.6742, lng: 115.1566 } },
  { id: 'mock:fishermans-wharf', name: 'Fisherman’s Wharf', address: 'Candolim, Goa, India', area: 'goa candolim', point: { lat: 15.5189, lng: 73.7623 } },
  { id: 'mock:chapora-fort', name: 'Chapora Fort', address: 'Chapora, Goa, India', area: 'goa chapora', point: { lat: 15.6054, lng: 73.7364 } },
  { id: 'mock:fontainhas', name: 'Fontainhas Latin Quarter', address: 'Panaji, Goa, India', area: 'goa panaji', point: { lat: 15.4966, lng: 73.8312 } },
  { id: 'mock:tsukiji', name: 'Tsukiji Outer Market', address: 'Chuo City, Tokyo, Japan', area: 'tokyo chuo', point: { lat: 35.6655, lng: 139.7707 } },
  { id: 'mock:senso-ji', name: 'Senso-ji Temple', address: 'Asakusa, Tokyo, Japan', area: 'tokyo asakusa', point: { lat: 35.7148, lng: 139.7967 } },
  { id: 'mock:shibuya', name: 'Shibuya Crossing', address: 'Shibuya, Tokyo, Japan', area: 'tokyo shibuya', point: { lat: 35.6595, lng: 139.7005 } },
  { id: 'mock:louvre', name: 'Louvre Museum', address: 'Rue de Rivoli, Paris, France', area: 'paris louvre', point: { lat: 48.8606, lng: 2.3376 } },
  { id: 'mock:cafe-de-flore', name: 'Café de Flore', address: 'Boulevard Saint-Germain, Paris, France', area: 'paris saint-germain cafe', point: { lat: 48.8541, lng: 2.3326 } },
  { id: 'mock:hawa-mahal', name: 'Hawa Mahal', address: 'Badi Choupad, Jaipur, Rajasthan, India', area: 'jaipur rajasthan', point: { lat: 26.9239, lng: 75.8267 } },
  { id: 'mock:amer-fort', name: 'Amer Fort', address: 'Amer, Jaipur, Rajasthan, India', area: 'jaipur amber amer rajasthan', point: { lat: 26.9855, lng: 75.8513 } },
  { id: 'mock:india-gate', name: 'India Gate', address: 'Rajpath, New Delhi, India', area: 'delhi new delhi', point: { lat: 28.6129, lng: 77.2295 } },
  { id: 'mock:humayun', name: 'Humayun’s Tomb', address: 'Nizamuddin, New Delhi, India', area: 'delhi new delhi nizamuddin', point: { lat: 28.5933, lng: 77.2507 } },
  { id: 'mock:city-palace-udaipur', name: 'City Palace Udaipur', address: 'Lake Pichola, Udaipur, Rajasthan, India', area: 'udaipur rajasthan', point: { lat: 24.5764, lng: 73.6835 } },
]

/** Accents don't get in the way of typing ("cafe" finds "Café"). */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

const result = (p: (typeof PLACES)[number]): GeocodeResult => ({ id: p.id, name: p.name, address: p.address, point: p.point })

/** Mock geocoder: substring match over a fixed catalogue, nearest to `near` first. Deterministic. */
export const mockGeocoding: GeocodingService = {
  attribution: 'Demo places — nothing is sent anywhere',

  async search(query, near, signal) {
    throwIfAborted(signal)
    const q = fold(query.trim())
    if (!q) return []
    const distance = (p: GeoPoint) => (near ? haversineKm(near, p) : 0)
    return PLACES.filter((p) => fold(`${p.name} ${p.address} ${p.area}`).includes(q))
      .sort((a, b) => distance(a.point) - distance(b.point) || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map(result)
  },

  async reverse(point, signal) {
    throwIfAborted(signal)
    const nearest = [...PLACES].sort((a, b) => haversineKm(point, a.point) - haversineKm(point, b.point))[0]
    return nearest && haversineKm(point, nearest.point) <= 1 ? { ...result(nearest), point } : undefined
  },
}
