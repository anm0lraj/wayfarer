import { useEffect, useRef, useState } from 'react'
import { MapPinOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useOnline } from '@/lib/hooks/useOnline'
import { cn } from '@/lib/cn'
import { useServices } from '@/services'
import type { MapHandle, MapMarker } from '@/services/maps/types'
import type { GeoPoint } from '@/types'

/** Turns the map into a place picker: a tap drops a pin, the pin can be dragged or nudged with the arrow keys. */
export interface MapPicker {
  /** The chosen point (controlled by the screen); null for none yet. */
  point: GeoPoint | null
  onPick: (point: GeoPoint) => void
  /** Hands the screen the live map (for `getCenter`), and null again when it goes away. */
  onHandle?: (handle: MapHandle | null) => void
}

interface TripMapProps {
  markers: MapMarker[]
  /** Points drawn as the route line, in order. */
  route?: GeoPoint[]
  selectedId?: string
  onSelect?: (id: string) => void
  /** Where to start when there is nothing to show yet. */
  fallbackCenter: GeoPoint
  /** Changing this re-fits the view to the markers (e.g. when the day changes). */
  fitKey: string
  className?: string
  picker?: MapPicker
}

/**
 * Map for a day or a whole trip. Talks only to the MapProvider interface, loads the vendor library lazily,
 * and keeps working as a list if tiles or the library can't load (offline, blocked).
 */
export function TripMap({ markers, route, selectedId, onSelect, fallbackCenter, fitKey, className, picker }: TripMapProps) {
  const { maps } = useServices()
  const online = useOnline()
  const el = useRef<HTMLDivElement>(null)
  const [handle, setHandle] = useState<MapHandle | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const pickerRef = useRef(picker)
  pickerRef.current = picker
  const picking = !!picker

  useEffect(() => {
    let cancelled = false
    let created: MapHandle | null = null
    maps.provider
      .create(el.current!, { center: fallbackCenter, zoom: 11, onMarkerClick: (id) => onSelectRef.current?.(id), onPointPick: picking ? (p) => pickerRef.current?.onPick(p) : undefined, onError: (m) => !cancelled && setFailed(m) })
      .then((h) => {
        if (cancelled) return h.destroy()
        created = h
        setHandle(h)
        pickerRef.current?.onHandle?.(h)
      })
      .catch((e: unknown) => !cancelled && setFailed(e instanceof Error ? e.message : 'The map couldn’t load'))
    return () => {
      cancelled = true
      created?.destroy()
      setHandle(null)
      pickerRef.current?.onHandle?.(null)
    }
    // The map is created once per mount; data flows in through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps.provider])

  useEffect(() => {
    handle?.setMarkers(markers.map((m) => ({ ...m, selected: m.id === selectedId })))
  }, [handle, markers, selectedId])

  const pickedLat = picker?.point?.lat
  const pickedLng = picker?.point?.lng
  useEffect(() => {
    if (!handle || !picking) return
    handle.setPickedPoint(pickedLat === undefined || pickedLng === undefined ? null : { lat: pickedLat, lng: pickedLng })
  }, [handle, picking, pickedLat, pickedLng])

  // When the picker opens on a place that is already chosen, start there, zoomed in.
  useEffect(() => {
    const p = pickerRef.current?.point
    if (handle && p) handle.flyTo(p, 15)
  }, [handle])

  useEffect(() => {
    if (!handle) return
    if (!route || route.length < 2) return handle.clearRoute()
    handle.drawRoute(route) // the straight line at once, so the map is never bare while the roads load
    let cancelled = false
    maps.routing.route(route).then((r) => { if (!cancelled && r.points !== route && r.points.length > 1) handle.drawRoute(r.points) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [handle, route, maps.routing])

  const points = markers.map((m) => m.point)
  useEffect(() => {
    if (handle && points.length) handle.fitBounds(points)
    // re-fit only when the caller says the subject changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, fitKey])

  useEffect(() => {
    const m = markers.find((x) => x.id === selectedId)
    if (handle && m) handle.flyTo(m.point)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, selectedId])

  useEffect(() => {
    if (!el.current || !handle) return
    const ro = new ResizeObserver(() => handle.resize())
    ro.observe(el.current)
    return () => ro.disconnect()
  }, [handle])

  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-border bg-surface-2', className)}>
      {/* The vendor library forces `position: relative` on its container, so the container fills this absolutely positioned wrapper instead. */}
      <div className="absolute inset-0"><div ref={el} role="application" aria-label={picking ? 'Map for choosing a location' : 'Map of your stops'} className="size-full" /></div>
      {!handle && !failed && <Skeleton className="absolute inset-0 rounded-none" />}
      {failed && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-surface-2 p-6 text-center">
          <div className="max-w-xs space-y-2">
            <MapPinOff aria-hidden className="mx-auto size-8 text-fg-muted" />
            <p className="font-semibold">The map isn’t available right now</p>
            <p className="text-sm text-fg-muted">{online ? 'It may be blocked or still loading.' : 'You’re offline.'} Your stops are still listed, and Directions links still work.</p>
          </div>
        </div>
      )}
      {handle && !online && <p role="status" className="absolute bottom-2 left-2 rounded-md bg-surface/90 px-2 py-1 text-xs shadow-sm">Offline — map tiles may be missing</p>}
    </div>
  )
}
