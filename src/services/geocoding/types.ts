import type { GeoPoint } from '@/types'

export interface GeocodeResult {
  /** Stable within one provider (used as a React key). */
  id: string
  name: string
  address?: string
  point: GeoPoint
}

/** What every geocoding vendor adapter implements. Screens depend on this, never on a vendor. */
export interface GeocodingService {
  /** Credit line the provider's licence asks us to show next to its results. */
  readonly attribution: string
  /** Places matching the text, best first. `near` biases (never restricts) the answer towards the trip area. */
  search(query: string, near?: GeoPoint, signal?: AbortSignal): Promise<GeocodeResult[]>
  /** The place at a point, or undefined when the provider knows nothing there. */
  reverse(point: GeoPoint, signal?: AbortSignal): Promise<GeocodeResult | undefined>
}
