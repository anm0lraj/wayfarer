import type { GeoPoint } from '@/types'
import type { MapHandle, MapMarker, MapOptions, MapProvider } from './types'

// This file is the only place maplibre-gl is imported, and only via dynamic import() so the
// library stays out of the initial bundle. A Google Maps adapter would implement the same MapProvider.
const TILE_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
}

const KIND_COLOR: Record<MapMarker['kind'], string> = {
  hotel: '#7c3aed', attraction: '#0f766e', restaurant: '#c2410c', activity: '#b45309', airport: '#475569', transport: '#475569', itinerary: '#0f766e',
}

const lngLat = (p: GeoPoint): [number, number] => [p.lng, p.lat]

export const maplibreProvider: MapProvider = {
  name: 'maplibre-osm',
  async create(el: HTMLElement, options: MapOptions): Promise<MapHandle> {
    const maplibregl = await import('maplibre-gl')
    // MapLibre 6 looks for its worker next to its own script, which the build does not copy. Bundle the worker (with the
    // shared code it imports) ourselves and tell the library where it is, or no map tile is ever drawn.
    maplibregl.setWorkerUrl((await import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')).default)
    await import('maplibre-gl/dist/maplibre-gl.css')
    const map = new maplibregl.Map({
      container: el, style: TILE_STYLE, center: lngLat(options.center), zoom: options.zoom ?? 10, attributionControl: { compact: true },
    })
    map.on('error', (e) => options.onError?.(e.error?.message ?? 'Map failed to load'))
    let markers: InstanceType<typeof maplibregl.Marker>[] = []

    const toBounds = (points: GeoPoint[]) => points.reduce((b, p) => b.extend(lngLat(p)), new maplibregl.LngLatBounds(lngLat(points[0]!), lngLat(points[0]!)))

    return {
      setMarkers(list) {
        markers.forEach((m) => m.remove())
        markers = list.map((m) => {
          const node = document.createElement('button')
          node.type = 'button'
          node.textContent = m.label ?? ''
          node.style.cssText = `min-width:32px;height:32px;border-radius:16px;border:2px solid #fff;color:#fff;font:600 13px system-ui;background:${KIND_COLOR[m.kind]};box-shadow:0 2px 6px rgba(0,0,0,.35);${m.selected ? 'outline:3px solid #fbbf24;' : ''}`
          node.addEventListener('click', () => options.onMarkerClick?.(m.id))
          const marker = new maplibregl.Marker({ element: node }).setLngLat(lngLat(m.point)).addTo(map)
          // MapLibre stamps every marker element with aria-label="Map marker" when it is added; set ours afterwards or
          // screen readers hear the same label for every stop.
          node.setAttribute('aria-label', m.ariaLabel)
          return marker
        })
      },
      drawRoute(points) {
        const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: points.map(lngLat) } }
        const apply = () => {
          const src = map.getSource('route') as { setData(d: typeof data): void } | undefined
          if (src) return src.setData(data)
          map.addSource('route', { type: 'geojson', data })
          map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#0f766e', 'line-width': 4, 'line-opacity': 0.85 } })
        }
        map.loaded() ? apply() : map.once('load', apply)
      },
      clearRoute() {
        if (map.getLayer('route')) map.removeLayer('route')
        if (map.getSource('route')) map.removeSource('route')
      },
      fitBounds(points, padding = 48) {
        if (points.length) map.fitBounds(toBounds(points), { padding, maxZoom: 15, duration: 0 })
      },
      flyTo: (p, zoom) => map.flyTo({ center: lngLat(p), zoom: zoom ?? map.getZoom() }),
      resize: () => map.resize(),
      destroy() {
        markers.forEach((m) => m.remove())
        map.remove()
      },
    }
  },
}
