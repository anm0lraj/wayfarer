import { SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useHotels } from '@/data/queries/bookings'
import { useDestination } from '@/data/queries/catalog'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { HotelCard } from './HotelCard'
import { HotelFilters } from './HotelFilters'
import { activeFilterCount, nightsBetween, parseHotelSearch, serializeHotelSearch, toHotelQuery, validStay, type HotelSearchState, type HotelSort } from './filters'

const SORT_LABELS: Record<HotelSort, string> = { recommended: 'Recommended', price: 'Lowest price', rating: 'Top rated', distance: 'Closest to centre' }

/** `/trips/:id/bookings/hotels` — stay + filters live in the query string, so a search is shareable and survives reload. */
export function HotelSearch() {
  const trip = useOutletContext<TripWithState>()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const desktop = useMediaQuery('(min-width: 1024px)')
  const destinationId = trip.destinationIds[0] ?? ''
  const destination = useDestination(destinationId)
  const plan = useTripPlan(trip.id)
  const search = useMemo(() => parseHotelSearch(params, trip), [params, trip])
  const stayOk = validStay(search)
  const hotels = useHotels(toHotelQuery(destinationId, search))
  // Options come from the unfiltered list so chips don't vanish as you narrow the results.
  const all = useHotels({ destinationId })
  const options = useMemo(() => {
    const h = all.data ?? []
    return { amenities: [...new Set(h.flatMap((x) => x.amenities))].sort(), propertyTypes: [...new Set(h.map((x) => x.propertyType))].sort() }
  }, [all.data])

  const update = (next: HotelSearchState) => setParams(serializeHotelSearch(next, trip), { replace: true })
  const nights = stayOk ? nightsBetween(search.checkIn, search.checkOut) : 1
  const savedIds = new Set((plan.data?.bookings ?? []).filter((b) => b.type === 'hotel' && b.status !== 'cancelled').map((b) => b.refId))
  const base = `/trips/${trip.id}/bookings/hotels`
  const detailQuery = serializeHotelSearch(search, trip).toString()
  const count = activeFilterCount(search)

  const filters = <HotelFilters value={search} onChange={update} options={options} currency={all.data?.[0]?.pricePerNight.currency} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Stays in {destination.data?.name ?? 'your destination'}</h2>
        <Link to={`/trips/${trip.id}/bookings`} className="inline-flex min-h-touch items-center text-sm font-semibold text-primary hover:underline">Back to bookings</Link>
      </div>

      <form onSubmit={(e) => e.preventDefault()} aria-label="Stay details" className="grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 sm:grid-cols-3">
        <Input label="Check-in" type="date" value={search.checkIn} onChange={(e) => update({ ...search, checkIn: e.target.value })} />
        <Input label="Check-out" type="date" value={search.checkOut} min={search.checkIn} onChange={(e) => update({ ...search, checkOut: e.target.value })} error={stayOk ? undefined : 'Check-out must be after check-in'} />
        <div className="col-span-2 sm:col-span-1"><Input label="Guests" type="number" min={1} max={12} value={search.guests} onChange={(e) => update({ ...search, guests: Math.max(1, Number(e.target.value) || 1) })} /></div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {desktop && <aside aria-label="Filters" className="self-start rounded-lg border border-border bg-surface p-4">{filters}</aside>}

        <section aria-label="Results" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-sm text-fg-muted">{hotels.data ? `${hotels.data.length} stay${hotels.data.length === 1 ? '' : 's'}` : ' '}</p>
            <div className="flex items-center gap-2">
              {!desktop && <Button variant="secondary" size="sm" onClick={() => setFiltersOpen(true)}><SlidersHorizontal aria-hidden className="size-4" /> Filters{count ? ` (${count})` : ''}</Button>}
              <label className="flex items-center gap-2 text-sm">
                <span className="text-fg-muted">Sort</span>
                <select value={search.sort} onChange={(e) => update({ ...search, sort: e.target.value as HotelSort })} className="min-h-touch rounded-md border border-border bg-surface px-2">
                  {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            </div>
          </div>

          {hotels.isPending ? (
            <SkeletonGroup label="Searching stays" className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></SkeletonGroup>
          ) : hotels.isError ? (
            <ErrorState title="Couldn’t load stays" description="Check your connection and try again." onRetry={() => void hotels.refetch()} />
          ) : hotels.data.length === 0 ? (
            <EmptyState title="No stays match" description="Try removing a filter." action={count ? <Button onClick={() => update({ ...search, maxPrice: undefined, minRating: undefined, maxDistanceKm: undefined, amenities: [], propertyTypes: [] })}>Clear filters</Button> : undefined} />
          ) : (
            <ul className="space-y-3">
              {hotels.data.map((h) => <HotelCard key={h.id} hotel={h} nights={nights} saved={savedIds.has(h.id)} to={`${base}/${h.id}${detailQuery ? `?${detailQuery}` : ''}`} />)}
            </ul>
          )}
        </section>
      </div>

      {!desktop && (
        <ResponsiveSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters" description={count ? `${count} applied` : undefined}>
          <div className="space-y-5">
            {filters}
            <Button className="w-full" onClick={() => setFiltersOpen(false)}>Show {hotels.data?.length ?? ''} stays</Button>
          </div>
        </ResponsiveSheet>
      )}
    </div>
  )
}
