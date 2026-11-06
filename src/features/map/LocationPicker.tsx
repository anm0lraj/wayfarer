import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, MapPin, MapPinOff, Search, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { formatPoint } from '@/lib/geo'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useOnline } from '@/lib/hooks/useOnline'
import { useServices } from '@/services'
import type { GeocodeResult } from '@/services/geocoding/types'
import type { CustomLocation, GeoPoint } from '@/types'
import { MapPickerSheet } from './MapPickerSheet'
import { MIN_SEARCH_CHARS, SEARCH_DEBOUNCE_MS, useGeocodeSearch } from './useGeocode'

interface LocationPickerProps {
  value: CustomLocation | undefined
  onChange: (value: CustomLocation | undefined) => void
  /** Middle of the trip area: biases the search and is where the map opens when nothing is chosen. */
  near: GeoPoint
  /** Text kept without a pin (it will not appear on the map). Omit both props to hide that option. */
  nameOnly?: string
  onNameOnlyChange?: (value: string | undefined) => void
  /** Name for a pin made from coordinates alone (e.g. the activity's title). */
  fallbackName?: string
  /** Keeps the label for screen readers only (when a legend already says "Location"). */
  hideLabel?: boolean
}

function parseCoordinates(lat: string, lng: string): { point?: GeoPoint; latError?: string; lngError?: string } {
  const out: { point?: GeoPoint; latError?: string; lngError?: string } = {}
  const has = (s: string) => s.trim() !== ''
  if (!has(lat)) out.latError = 'Enter a latitude'
  else if (!(Math.abs(Number(lat)) <= 90)) out.latError = 'Latitude is between −90 and 90'
  if (!has(lng)) out.lngError = 'Enter a longitude'
  else if (!(Math.abs(Number(lng)) <= 180)) out.lngError = 'Longitude is between −180 and 180'
  if (!out.latError && !out.lngError) out.point = { lat: Number(lat), lng: Number(lng) }
  return out
}

/**
 * Chooses where a custom activity is: search for a place or address, tap it on a map, or enter coordinates.
 * It never asks for the device's location. A chosen place becomes a pin on the map; text that can't be found can be
 * kept as a name only.
 */
export function LocationPicker({ value, onChange, near, nameOnly, onNameOnlyChange, fallbackName, hideLabel }: LocationPickerProps) {
  const { geocoding } = useServices()
  const online = useOnline()
  const ids = useId()
  const listId = `${ids}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const focusAfter = useRef<'card' | 'search' | null>(null)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [listOpen, setListOpen] = useState(true)
  const [mapOpen, setMapOpen] = useState(false)
  const [coordsOpen, setCoordsOpen] = useState(false)
  const [coords, setCoords] = useState({ lat: '', lng: '', name: '' })
  const [coordsTried, setCoordsTried] = useState(false)

  const typed = query.trim()
  const debounced = useDebouncedValue(typed, SEARCH_DEBOUNCE_MS)
  const search = useGeocodeSearch(debounced, near, online)
  const results = search.data ?? []

  const tooShort = typed.length > 0 && typed.length < MIN_SEARCH_CHARS
  const waiting = typed.length >= MIN_SEARCH_CHARS && typed !== debounced
  const settled = !waiting && debounced.length >= MIN_SEARCH_CHARS
  const state: 'idle' | 'short' | 'loading' | 'offline' | 'error' | 'none' | 'results' =
    typed.length === 0 ? 'idle'
      : tooShort ? 'short'
        : waiting ? 'loading'
          : search.data ? (results.length ? 'results' : 'none')
            : !online ? 'offline'
              : search.isError ? 'error'
                : settled ? 'loading' : 'idle'
  const showList = state === 'results' && listOpen

  useEffect(() => { setActive(-1); setListOpen(true) }, [debounced])

  // Focus follows the change: onto the card after choosing a place, back to the search field after clearing.
  const hasCard = !!value || nameOnly !== undefined
  useEffect(() => {
    if (focusAfter.current === 'card' && hasCard) cardRef.current?.focus()
    if (focusAfter.current === 'search' && !hasCard) inputRef.current?.focus()
    focusAfter.current = null
  }, [hasCard, value])

  const choose = (r: GeocodeResult) => {
    focusAfter.current = 'card'
    setQuery('')
    onNameOnlyChange?.(undefined)
    onChange({ name: r.name, address: r.address, point: r.point })
  }
  const clear = () => {
    focusAfter.current = 'search'
    onChange(undefined)
    onNameOnlyChange?.(undefined)
  }
  const keepNameOnly = () => {
    focusAfter.current = 'card'
    onChange(undefined)
    onNameOnlyChange?.(typed)
    setQuery('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // this field sits inside a form: Enter picks a result, it never submits
      if (showList) choose(results[active >= 0 ? active : 0]!)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (state !== 'results') return
      e.preventDefault()
      setListOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a < 0 ? (step > 0 ? 0 : results.length - 1) : (a + step + results.length) % results.length))
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault()
      e.stopPropagation() // closes the list, not the sheet around it
      setListOpen(false)
      setActive(-1)
    }
  }

  const applyCoords = () => {
    setCoordsTried(true)
    const { point } = parseCoordinates(coords.lat, coords.lng)
    if (!point) return
    focusAfter.current = 'card'
    onNameOnlyChange?.(undefined)
    onChange({ name: coords.name.trim() || fallbackName?.trim() || 'Pinned location', point })
    setCoordsOpen(false)
    setCoordsTried(false)
    setCoords({ lat: '', lng: '', name: '' })
  }
  const parsed = coordsTried ? parseCoordinates(coords.lat, coords.lng) : {}
  const onCoordKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    applyCoords()
  }

  const confirmMap = (loc: CustomLocation) => {
    onNameOnlyChange?.(undefined)
    onChange(loc)
    setMapOpen(false)
    // The map sheet returns focus to its opener as it closes; take it from there once that has happened.
    setTimeout(() => cardRef.current?.focus(), 80)
  }

  const offerNameOnly = onNameOnlyChange && (state === 'none' || state === 'offline' || state === 'error')

  return (
    <div className="space-y-3">
      <p className={cn('text-sm font-medium', hideLabel && 'sr-only')} id={`${ids}-label`}>Location</p>

      {value ? (
        <div ref={cardRef} tabIndex={-1} role="group" aria-label="Chosen location" className="space-y-2 rounded-lg border border-border bg-surface-2 p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <p className="flex items-start gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block font-medium">{value.name}</span>
              {value.address && <span className="line-clamp-2 block text-sm text-fg-muted">{value.address}</span>}
              <span className="block text-xs tabular-nums text-fg-muted">{formatPoint(value.point)}</span>
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMapOpen(true)}>Adjust on map</Button>
            <Button size="sm" variant="ghost" onClick={clear}><X aria-hidden className="size-4" /> Clear<span className="sr-only"> location</span></Button>
          </div>
        </div>
      ) : nameOnly !== undefined ? (
        <div ref={cardRef} tabIndex={-1} role="group" aria-label="Place name only" className="space-y-2 rounded-lg border border-border bg-surface-2 p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <p className="flex items-start gap-2"><MapPinOff aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" /><span className="min-w-0"><span className="block font-medium">{nameOnly}</span><span className="block text-sm text-fg-muted">Saved as a name only. It will not appear on the map.</span></span></p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={clear}><X aria-hidden className="size-4" /> Clear<span className="sr-only"> location</span></Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-labelledby={`${ids}-label`}
              aria-expanded={showList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={showList && active >= 0 ? `${ids}-opt-${active}` : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search for a place or address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="min-h-touch w-full rounded-md border border-border-strong bg-surface pl-10 pr-3 text-base text-fg placeholder:text-fg-muted"
            />
          </div>

          <ul id={listId} role="listbox" aria-label="Matching places" hidden={!showList} className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {results.map((r, i) => (
              <li
                key={r.id} id={`${ids}-opt-${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} onClick={() => choose(r)} onMouseEnter={() => setActive(i)}
                className={cn('flex min-h-touch cursor-pointer items-start gap-2 px-3 py-2', i === active && 'bg-surface-2')}
              >
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
                <span className="min-w-0"><span className="block font-medium">{r.name}</span>{r.address && <span className="line-clamp-2 block text-sm text-fg-muted">{r.address}</span>}</span>
              </li>
            ))}
          </ul>

          <div aria-live="polite" className="text-sm text-fg-muted">
            {state === 'short' && <p>Keep typing — at least {MIN_SEARCH_CHARS} characters.</p>}
            {state === 'loading' && <div role="status" aria-label="Searching places" className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
            {state === 'results' && <p className="sr-only">{results.length} {results.length === 1 ? 'place' : 'places'} found. Use the arrow keys and Enter to choose.</p>}
            {state === 'none' && <p>No places found for “{debounced}”. Try another spelling, or choose it on the map.</p>}
            {state === 'offline' && <p className="flex items-start gap-2"><WifiOff aria-hidden className="mt-0.5 size-4 shrink-0" />You’re offline, so place search isn’t available. You can still enter coordinates.</p>}
            {state === 'error' && (
              <div role="alert" className="flex flex-wrap items-center gap-2 text-error">
                <span>Couldn’t search for places right now.</span>
                <Button size="sm" variant="secondary" onClick={() => void search.refetch()}>Try again</Button>
              </div>
            )}
          </div>

          {offerNameOnly && (
            <div className="space-y-1">
              <Button size="sm" variant="secondary" onClick={keepNameOnly}>Use “{typed}” as the name only</Button>
              <p className="text-xs text-fg-muted">It will not appear on the map.</p>
            </div>
          )}
          {state === 'results' && <p className="text-xs text-fg-muted">{geocoding.attribution}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMapOpen(true)}><MapPin aria-hidden className="size-4" /> Choose on map</Button>
            <Button size="sm" variant="ghost" aria-expanded={coordsOpen} aria-controls={`${ids}-coords`} onClick={() => setCoordsOpen(!coordsOpen)}>
              Enter coordinates <ChevronDown aria-hidden className={cn('size-4 transition-transform', coordsOpen && 'rotate-180')} />
            </Button>
          </div>

          {coordsOpen && (
            <div id={`${ids}-coords`} role="group" aria-label="Coordinates" className="space-y-3 rounded-lg border border-border p-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Latitude" inputMode="decimal" placeholder="-8.69" value={coords.lat} error={parsed.latError} onKeyDown={onCoordKey} onChange={(e) => setCoords({ ...coords, lat: e.target.value })} />
                <Input label="Longitude" inputMode="decimal" placeholder="115.16" value={coords.lng} error={parsed.lngError} onKeyDown={onCoordKey} onChange={(e) => setCoords({ ...coords, lng: e.target.value })} />
              </div>
              <Input label="Name for this pin (optional)" value={coords.name} onKeyDown={onCoordKey} onChange={(e) => setCoords({ ...coords, name: e.target.value })} />
              <Button size="sm" onClick={applyCoords}>Use these coordinates</Button>
            </div>
          )}
        </>
      )}

      <MapPickerSheet open={mapOpen} onClose={() => setMapOpen(false)} onConfirm={confirmMap} initial={value} near={near} suggestedName={fallbackName} />
    </div>
  )
}
