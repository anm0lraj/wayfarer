import { mapService } from '@/services/maps/mock'
import type { MapHandle, MapMarker, MapOptions, MapProvider, MapService } from '@/services/maps/types'
import type { GeoPoint } from '@/types'

/**
 * A map provider for tests: MapLibre can't run in jsdom, so this records what the screen asks the map to do
 * and lets a test "click" a marker.
 */
export function createFakeMap() {
  const state = {
    markers: [] as MapMarker[], route: [] as GeoPoint[], flownTo: undefined as GeoPoint | undefined, fitCount: 0, options: undefined as MapOptions | undefined, created: 0,
    /** The pin shown by `setPickedPoint` (null when none). */
    picked: null as GeoPoint | null,
    /** What `getCenter` answers; tests move it with `setCenter`. */
    center: { lat: 0, lng: 0 } as GeoPoint,
  }
  const provider: MapProvider = {
    name: 'fake',
    async create(_el, options): Promise<MapHandle> {
      state.created++
      state.options = options
      state.center = options.center
      state.picked = null
      return {
        setMarkers: (m) => { state.markers = m },
        drawRoute: (p) => { state.route = p },
        clearRoute: () => { state.route = [] },
        fitBounds: () => { state.fitCount++ },
        flyTo: (p) => { state.flownTo = p },
        setPickedPoint: (p) => { state.picked = p },
        getCenter: () => state.center,
        resize: () => {},
        destroy: () => {},
      }
    },
  }
  const maps: MapService = { ...mapService, provider }
  return {
    state, maps,
    click: (id: string) => state.options?.onMarkerClick?.(id),
    /** A tap, drag or nudge on the map in picking mode. */
    pick: (point: GeoPoint) => state.options?.onPointPick?.(point),
    setCenter: (point: GeoPoint) => { state.center = point },
  }
}
