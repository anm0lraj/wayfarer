import { useEffect, useRef, useState } from 'react'
import { Crosshair, Loader2 } from 'lucide-react'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPoint } from '@/lib/geo'
import { useOnline } from '@/lib/hooks/useOnline'
import { useServices } from '@/services'
import type { MapHandle } from '@/services/maps/types'
import type { CustomLocation, GeoPoint } from '@/types'
import { TripMap } from './TripMap'

type Lookup = 'idle' | 'loading' | 'found' | 'none' | 'failed'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (location: CustomLocation) => void
  /** The place already chosen, if any: the map opens on it. */
  initial?: CustomLocation
  /** Middle of the trip area, where the map opens when nothing is chosen. */
  near: GeoPoint
  /** Name to offer when the spot has no name of its own. */
  suggestedName?: string
}

const sameSpot = (a: GeoPoint, b: GeoPoint) => Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lng - b.lng) < 1e-7
const LOOKUP_DELAY_MS = 300

/**
 * Pick a place by pointing at the map: full-height sheet on a phone, dialog elsewhere. A tap (or drag) drops the pin and
 * looks up its name; the name stays editable. Without a pointer, "Pin the map centre" takes the middle of the map.
 */
export function MapPickerSheet({ open, onClose, onConfirm, initial, near, suggestedName }: Props) {
  const { geocoding } = useServices()
  const online = useOnline()
  const [point, setPoint] = useState<GeoPoint | null>(initial?.point ?? null)
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address)
  const [lookup, setLookup] = useState<Lookup>('idle')
  const edited = useRef(false)
  const handle = useRef<MapHandle | null>(null)
  const [hasHandle, setHasHandle] = useState(false)

  // Each opening starts from the place already chosen (or empty).
  useEffect(() => {
    if (!open) return
    setPoint(initial?.point ?? null)
    setName(initial?.name ?? '')
    setAddress(initial?.address)
    setLookup('idle')
    edited.current = false
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Look up what is at the pin, a moment after it stops moving; a newer pin cancels the older lookup.
  useEffect(() => {
    if (!open || !point || (initial && sameSpot(point, initial.point))) return
    const ctl = new AbortController()
    setLookup('loading')
    const timer = setTimeout(() => {
      geocoding.reverse(point, ctl.signal).then(
        (r) => {
          if (ctl.signal.aborted) return
          setAddress(r?.address)
          if (r && !edited.current) setName(r.name)
          setLookup(r ? 'found' : 'none')
        },
        (e: unknown) => { if (!ctl.signal.aborted && !(e instanceof DOMException && e.name === 'AbortError')) setLookup('failed') },
      )
    }, LOOKUP_DELAY_MS)
    return () => { clearTimeout(timer); ctl.abort() }
  }, [open, point?.lat, point?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (p: GeoPoint) => {
    setPoint(p)
    if (!edited.current) setName('')
    setAddress(undefined)
  }
  const pinCentre = () => {
    const c = handle.current?.getCenter()
    if (c) pick(c)
  }
  const confirm = () => {
    if (!point) return
    onConfirm({ name: name.trim() || suggestedName?.trim() || 'Pinned location', address, point })
  }

  const lookupText =
    lookup === 'loading' ? 'Looking up the name…'
      : lookup === 'found' ? 'Name filled in from the map. You can change it.'
        : lookup === 'none' ? 'No name found at this spot. Type one below.'
          : lookup === 'failed' ? (online ? 'Couldn’t look up the name. Type one below.' : 'You’re offline, so the name can’t be looked up. Type one below.')
            : ''

  return (
    <ResponsiveSheet
      open={open} onOpenChange={(o) => !o && onClose()} title="Choose on map" wide="dialog" phone="full"
      description="Tap the map to drop a pin, then drag it to adjust."
    >
      <div className="space-y-4">
        <TripMap
          className="h-[44dvh] min-h-64 w-full" markers={[]} fallbackCenter={initial?.point ?? near} fitKey="picker"
          picker={{ point, onPick: pick, onHandle: (h) => { handle.current = h; setHasHandle(!!h) } }}
        />
        <div className="space-y-1">
          <Button variant="secondary" size="sm" disabled={!hasHandle} onClick={pinCentre}><Crosshair aria-hidden className="size-4" /> Pin the map centre</Button>
          <p className="text-xs text-fg-muted">Without a touch screen or mouse: move the map with the arrow keys, then press “Pin the map centre”. With the pin focused, the arrow keys nudge it.</p>
        </div>

        {point ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-3">
            <Input label="Place name" value={name} placeholder={suggestedName || 'Pinned location'} onChange={(e) => { edited.current = true; setName(e.target.value) }} />
            {address && <p className="text-sm text-fg-muted">{address}</p>}
            <p className="text-xs tabular-nums text-fg-muted">{formatPoint(point)}</p>
            <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
              {lookup === 'loading' && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}{lookupText}
            </p>
          </div>
        ) : (
          <p role="status" className="text-sm text-fg-muted">No pin yet.</p>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={!point} onClick={confirm}>Use this location</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </ResponsiveSheet>
  )
}
