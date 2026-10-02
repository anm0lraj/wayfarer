import type { GeoPoint } from '@/types'

export interface MapMarker {
  id: string
  point: GeoPoint
  /** Visible number (1, 2, 3…) for itinerary stops; omit for plain pins. */
  label?: string
  kind: 'hotel' | 'attraction' | 'restaurant' | 'activity' | 'airport' | 'transport' | 'itinerary'
  /** Screen-reader text, e.g. "Stop 2: Uluwatu Temple". */
  ariaLabel: string
  selected?: boolean
}

export interface MapOptions {
  center: GeoPoint
  zoom?: number
  onMarkerClick?: (id: string) => void
  /** Called when the provider fails to load (offline, blocked tiles) so the screen can show a fallback. */
  onError?: (message: string) => void
}

/** What every map vendor adapter implements. Screens depend on this, never on a vendor SDK. */
export interface MapHandle {
  setMarkers(markers: MapMarker[]): void
  drawRoute(points: GeoPoint[]): void
  clearRoute(): void
  fitBounds(points: GeoPoint[], paddingPx?: number): void
  flyTo(point: GeoPoint, zoom?: number): void
  resize(): void
  destroy(): void
}

export interface MapProvider {
  readonly name: string
  /** Loads the vendor library lazily, then mounts a map into `el`. */
  create(el: HTMLElement, options: MapOptions): Promise<MapHandle>
}

export interface Route {
  points: GeoPoint[]
  distanceKm: number
  durationMin: number
}

export interface RoutingService {
  route(stops: GeoPoint[]): Promise<Route>
}

export type DeepLinkMode = 'directions' | 'navigate' | 'view'

export interface MapLinks {
  /** Deep link into the device's maps app (Apple Maps on iOS, Google Maps elsewhere). */
  deepLink(to: GeoPoint, mode: DeepLinkMode, label?: string): string
}

export interface MapService {
  provider: MapProvider
  routing: RoutingService
  links: MapLinks
}
