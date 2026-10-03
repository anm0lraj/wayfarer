import { haversineKm } from '@/lib/geo'
import type { GeoPoint } from '@/types'
import type { Route, RoutingService } from './types'

/**
 * Real road routes from OSRM (https://project-osrm.org), called straight from the browser. The public server is a
 * shared demo for light use (about one request a second); before launch point `BASE` at a routing service you control
 * or pay for. The `RoutingService` interface stays the same.
 */
const BASE = 'https://router.project-osrm.org/route/v1/driving'

/** OSRM's demo server refuses very long requests; a day trip never needs more. */
const MAX_STOPS = 25

const cache = new Map<string, Route>()

const straightLine = (stops: GeoPoint[]): Route => {
  let km = 0
  for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1]!, stops[i]!)
  return { points: stops, distanceKm: Math.round(km * 10) / 10, durationMin: 0 }
}

interface OsrmResponse {
  code: string
  routes?: Array<{ distance: number; duration: number; geometry: { coordinates: Array<[number, number]> } }>
}

export const osrmRouting: RoutingService = {
  async route(stops) {
    if (stops.length < 2) return { points: stops, distanceKm: 0, durationMin: 0 }
    const used = stops.slice(0, MAX_STOPS)
    const key = used.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
    const hit = cache.get(key)
    if (hit) return hit
    try {
      const res = await fetch(`${BASE}/${key}?overview=full&geometries=geojson`)
      if (!res.ok) throw new Error(`Routing unavailable (${res.status})`)
      const body = (await res.json()) as OsrmResponse
      const r = body.routes?.[0]
      if (body.code !== 'Ok' || !r) throw new Error('No route found')
      const route: Route = {
        points: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        distanceKm: Math.round(r.distance / 100) / 10,
        durationMin: Math.round(r.duration / 60),
      }
      cache.set(key, route)
      return route
    } catch {
      // No route (offline, a stop on an island, the demo server busy): fall back to the straight line rather than nothing.
      return straightLine(used)
    }
  },
}
