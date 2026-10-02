import { useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { Bookmark, Compass, Navigation, Plus, Star } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useDestination, useSavedPlaceIds, useToggleSavedPlace, useTripPlaces } from '@/data/queries/catalog'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { CATEGORY_META } from '@/features/itinerary/categoryMeta'
import { itemCategoryForPlace } from '@/features/itinerary/placeCategory'
import { suggestNextStart } from '@/features/itinerary/schedule'
import { useItineraryActions } from '@/features/itinerary/useItineraryActions'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import { useServices } from '@/services'
import type { MapMarker } from '@/services/maps/types'
import type { GeoPoint, ItineraryDay, ItineraryItem, Place } from '@/types'
import { TripMap } from './TripMap'
import { dayMarkers, placeMarkerKind, useHotelMarkers, useItemPoints, useNearbyPlaces } from './useMapData'

const NO_DAYS: ItineraryDay[] = []

/** `/trips/:tripId/map?day=2&item=…` — the whole trip, or one day, on a map with directions, nearby places and saving. */
export default function MapRoute() {
  const trip = useOutletContext<TripWithState>()
  const { maps } = useServices()
  const [params, setParams] = useSearchParams()
  const plan = useTripPlan(trip.id)
  const destination = useDestination(trip.destinationIds[0])
  const actions = useItineraryActions(trip.id)
  const saved = useSavedPlaceIds()
  const toggleSaved = useToggleSavedPlace()
  const [nearby, setNearby] = useState(false)

  const days = plan.data?.days ?? NO_DAYS
  const dayParam = params.get('day')
  const day = days.find((d) => String(d.dayNumber) === dayParam)
  // ?place=<id> comes from "View on map" on an assistant suggestion: show that place even if it isn't in the plan.
  const placeParam = params.get('place')
  const selectedId = params.get('item') ?? (placeParam ? `place:${placeParam}` : undefined)
  const setSelected = (id?: string) => {
    const p = new URLSearchParams(params)
    p.delete('place')
    id ? p.set('item', id) : p.delete('item')
    setParams(p, { replace: true })
  }
  const tripPlaces = useTripPlaces(trip.destinationIds)
  const focusPlace = placeParam ? tripPlaces.data?.find((p) => p.id === placeParam) : undefined
  const setDay = (n?: number) => {
    const p = new URLSearchParams()
    if (n) p.set('day', String(n))
    setParams(p, { replace: true })
  }

  const allItems = useMemo(() => plan.data?.items ?? [], [plan.data])
  const visibleItems = useMemo(() => (day ? allItems.filter((i) => i.dayId === day.id) : allItems), [allItems, day])
  const points = useItemPoints(allItems)
  const hotels = useHotelMarkers(plan.data?.bookings ?? [])

  const itemMarkers = useMemo<MapMarker[]>(() => {
    if (day) return dayMarkers(visibleItems, points)
    return days.flatMap((d) => dayMarkers(visibleItems.filter((i) => i.dayId === d.id), points).map((m) => ({ ...m, label: `${d.dayNumber}.${m.label}`, ariaLabel: `Day ${d.dayNumber}, ${m.ariaLabel.toLowerCase()}` })))
  }, [day, days, visibleItems, points])

  const selectedItem = allItems.find((i) => i.id === selectedId)
  // Nearby search is anchored on the selected stop, else the first stop that isn't just an airport/transfer.
  const center: GeoPoint | undefined = (selectedItem && points.get(selectedItem.id)) || (itemMarkers.find((m) => m.kind !== 'transport') ?? itemMarkers[0])?.point || destination.data?.location
  // Hide only what's already on the map; a place used on another day is still a fair suggestion for this one.
  const nearbyPlaces = useNearbyPlaces(nearby ? center : undefined, trip.destinationIds, visibleItems.map((i) => i.placeId).filter((x): x is string => !!x))
  const selectedNearby: (Place & { distanceKm?: number }) | undefined = nearbyPlaces.find((p) => `place:${p.id}` === selectedId) ?? (focusPlace && selectedId === `place:${focusPlace.id}` ? focusPlace : undefined)

  const markers = useMemo(() => {
    const list = nearbyPlaces.map((p) => ({ id: `place:${p.id}`, point: p.location, kind: placeMarkerKind(p), ariaLabel: `Nearby: ${p.name}` }))
    if (focusPlace && !list.some((m) => m.id === `place:${focusPlace.id}`)) list.push({ id: `place:${focusPlace.id}`, point: focusPlace.location, kind: placeMarkerKind(focusPlace), ariaLabel: `Place: ${focusPlace.name}` })
    return [...itemMarkers, ...hotels, ...list]
  }, [itemMarkers, hotels, nearbyPlaces, focusPlace])
  const route = useMemo(() => (day ? itemMarkers.map((m) => m.point) : undefined), [day, itemMarkers])

  if (plan.isPending) return <SkeletonGroup label="Loading map" className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-[60dvh]" /></SkeletonGroup>
  if (plan.isError) return <ErrorState title="Couldn’t load the map" onRetry={() => void plan.refetch()} />

  const stops = visibleItems.filter((i) => points.has(i.id))
  const addNearby = (placeId: string) => {
    const p = nearbyPlaces.find((x) => x.id === placeId)
    const target = day ?? days[0]
    if (!p || !target) return
    const dayItems = allItems.filter((i) => i.dayId === target.id).sort((a, b) => a.position - b.position)
    void actions.add(target.id, target.dayNumber, {
      title: p.name, startTime: suggestNextStart(dayItems), durationMin: p.typicalDurationMin ?? 90, category: itemCategoryForPlace(p),
      placeId: p.id, description: p.description, estimatedCost: p.costEstimate, image: p.images[0],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Day" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <Chip className="shrink-0" selected={!day} onClick={() => setDay()}>All days</Chip>
          {days.map((d) => <Chip key={d.id} className="shrink-0" selected={day?.id === d.id} onClick={() => setDay(d.dayNumber)}>Day {d.dayNumber}</Chip>)}
        </div>
        <Chip className="ml-auto shrink-0" selected={nearby} onClick={() => setNearby(!nearby)}><Compass aria-hidden className="size-4" /> Nearby places</Chip>
      </div>

      {allItems.length === 0 ? (
        <EmptyState title="Nothing to show on the map yet" description="Stops you add to the itinerary appear here as numbered pins with a route between them." action={<Button asChild><Link to={`/trips/${trip.id}/itinerary`}>Plan your days</Link></Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <TripMap
            className="h-[52dvh] lg:h-[calc(100dvh-14rem)]" markers={markers} route={route} selectedId={selectedId} onSelect={setSelected}
            fitKey={`${day?.id ?? 'all'}:${nearby}:${placeParam ?? ''}`} fallbackCenter={destination.data?.location ?? { lat: 0, lng: 0 }}
          />
          <div className="min-w-0 space-y-3 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
            {selectedItem && <SelectedItem item={selectedItem} point={points.get(selectedItem.id)} tripId={trip.id} links={maps.links} saved={selectedItem.placeId ? saved.data?.has(selectedItem.placeId) : undefined} onSave={() => selectedItem.placeId && toggleSaved.mutate(selectedItem.placeId)} />}
            {selectedNearby && (
              <article aria-label={selectedNearby.name} className="space-y-2 rounded-lg border border-primary/50 bg-surface p-3 shadow-sm">
                <div className="flex gap-3">
                  <img src={selectedNearby.images[0]} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0">
                    <h3 className="font-semibold">{selectedNearby.name}</h3>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                      {selectedNearby.distanceKm !== undefined && <span>{selectedNearby.distanceKm} km away</span>}
                      {selectedNearby.rating && <span className="inline-flex items-center gap-0.5"><Star aria-hidden className="size-3 fill-current" />{selectedNearby.rating.toFixed(1)}</span>}
                      {selectedNearby.costEstimate && <span>{selectedNearby.costEstimate.amount === 0 ? 'Free' : formatMoney(selectedNearby.costEstimate)}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => addNearby(selectedNearby.id)}><Plus aria-hidden className="size-4" /> Add to {day ? `Day ${day.dayNumber}` : 'Day 1'}</Button>
                  <Button size="sm" variant="secondary" aria-pressed={saved.data?.has(selectedNearby.id) ?? false} onClick={() => toggleSaved.mutate(selectedNearby.id)}>
                    <Bookmark aria-hidden className={cn('size-4', saved.data?.has(selectedNearby.id) && 'fill-primary text-primary')} /> {saved.data?.has(selectedNearby.id) ? 'Saved' : 'Save'}
                  </Button>
                  <Button asChild size="sm" variant="secondary"><a href={maps.links.deepLink(selectedNearby.location, 'directions', selectedNearby.name)} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden className="size-4" /> Directions</a></Button>
                </div>
              </article>
            )}
            {nearby && nearbyPlaces.length === 0 && <p className="rounded-lg bg-surface-2 p-3 text-sm text-fg-muted">No other places within 4 km of {selectedItem ? 'this stop' : 'the first stop'}.</p>}

            <section aria-label="Stops">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">{day ? `Day ${day.dayNumber} stops` : 'All stops'}</h2>
              {stops.length === 0 ? <p className="text-sm text-fg-muted">None of these activities has a map location yet.</p> : (
                <ol className="space-y-1.5">
                  {stops.map((i) => {
                    const m = itemMarkers.find((x) => x.id === i.id)
                    const Icon = CATEGORY_META[i.category].icon
                    return (
                      <li key={i.id}>
                        <button type="button" aria-pressed={selectedId === i.id} onClick={() => setSelected(i.id)} className={cn('flex min-h-touch w-full items-center gap-3 rounded-lg border p-2 text-left', selectedId === i.id ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:bg-surface-2')}>
                          <span aria-hidden className="grid min-w-7 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-fg">{m?.label}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.title}</span><span className="block text-xs text-fg-muted">{i.startTime}{!day && ` · Day ${days.find((d) => d.id === i.dayId)?.dayNumber}`}</span></span>
                          <Icon aria-hidden className="size-4 shrink-0 text-fg-muted" />
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function SelectedItem({ item, point, tripId, links, saved, onSave }: { item: ItineraryItem; point?: GeoPoint; tripId: string; links: ReturnType<typeof useServices>['maps']['links']; saved?: boolean; onSave: () => void }) {
  return (
    <article aria-label={item.title} className="space-y-2 rounded-lg border border-primary/50 bg-surface p-3 shadow-sm">
      <div>
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-sm text-fg-muted">{item.startTime} · {item.durationMin} min{item.travelTimeFromPrevMin !== undefined ? ` · ${item.travelTimeFromPrevMin} min from previous stop` : ''}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {point && <Button asChild size="sm"><a href={links.deepLink(point, 'navigate', item.title)} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden className="size-4" /> Navigate</a></Button>}
        {point && <Button asChild size="sm" variant="secondary"><a href={links.deepLink(point, 'directions', item.title)} target="_blank" rel="noopener noreferrer">Directions</a></Button>}
        {saved !== undefined && (
          <Button size="sm" variant="secondary" aria-pressed={saved} onClick={onSave}>
            <Bookmark aria-hidden className={cn('size-4', saved && 'fill-primary text-primary')} /> {saved ? 'Saved' : 'Save location'}
          </Button>
        )}
        <Button asChild size="sm" variant="ghost"><Link to={`/trips/${tripId}/itinerary/items/${item.id}`}>Details</Link></Button>
      </div>
    </article>
  )
}
