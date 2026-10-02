import type { GeoPoint } from '@/types'

const R = 6371

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Rough road travel time estimate (mock routing): ~25 km/h average on island roads plus a fixed overhead. */
export function estimateTravelMinutes(km: number): number {
  return Math.round(5 + (km / 25) * 60)
}
