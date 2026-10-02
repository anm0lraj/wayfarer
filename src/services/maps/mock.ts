import { estimateTravelMinutes, haversineKm } from '@/lib/geo'
import { maplibreProvider } from './maplibreProvider'
import type { DeepLinkMode, MapLinks, MapService, RoutingService } from './types'

/** Mock routing: straight lines between stops with a haversine-based ETA. Swap for OSRM/Google later. */
const routing: RoutingService = {
  async route(stops) {
    let km = 0
    for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1]!, stops[i]!)
    return { points: stops, distanceKm: Math.round(km * 10) / 10, durationMin: stops.length > 1 ? estimateTravelMinutes(km) : 0 }
  },
}

const isApple = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document

const links: MapLinks = {
  deepLink(to, mode: DeepLinkMode, label) {
    const q = `${to.lat},${to.lng}`
    if (isApple()) {
      return mode === 'view' ? `https://maps.apple.com/?ll=${q}&q=${encodeURIComponent(label ?? 'Location')}` : `https://maps.apple.com/?daddr=${q}&dirflg=d`
    }
    return mode === 'view'
      ? `https://www.google.com/maps/search/?api=1&query=${q}`
      : `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving${mode === 'navigate' ? '&dir_action=navigate' : ''}`
  },
}

export const mapService: MapService = { provider: maplibreProvider, routing, links }
