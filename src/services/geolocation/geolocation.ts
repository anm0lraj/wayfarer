import type { GeoPoint } from '@/types'

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export interface GeolocationService {
  isSupported(): boolean
  permission(): Promise<LocationPermission>
  /**
   * Requests a single position fix, which triggers the browser prompt if undecided.
   * Show the in-context explanation before calling. Never returns a fake position — failures throw.
   */
  getPosition(signal?: AbortSignal): Promise<GeoPoint>
  /** Updates only while the app is open (the web has no background location). Returns an unsubscribe function. */
  watch(onPosition: (p: GeoPoint) => void, onError: (e: GeolocationPositionError) => void): () => void
}

export const geolocationService: GeolocationService = {
  isSupported: () => typeof navigator !== 'undefined' && 'geolocation' in navigator,

  async permission() {
    if (!geolocationService.isSupported()) return 'unsupported'
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      return status.state as LocationPermission
    } catch {
      return 'prompt' // Permissions API missing (older Safari)
    }
  },

  getPosition: (signal) =>
    new Promise<GeoPoint>((resolve, reject) => {
      if (!geolocationService.isSupported()) return reject(new Error('Location is not supported in this browser'))
      if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      )
    }),

  watch(onPosition, onError) {
    if (!geolocationService.isSupported()) return () => {}
    const id = navigator.geolocation.watchPosition((pos) => onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }), onError, { maximumAge: 30_000 })
    return () => navigator.geolocation.clearWatch(id)
  },
}
