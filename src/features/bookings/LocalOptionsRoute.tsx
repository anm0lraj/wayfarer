import { useMemo } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Chip } from '@/components/ui/Chip'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { transitCity, TRANSIT_CITIES } from '@/data/transitCities'
import { useItemPoints } from '@/features/map/useMapData'
import type { ItineraryDay, ItineraryItem } from '@/types'
import { LocalOptionsPanel } from './LocalOptionsPanel'
import { parseTransitParams } from './transit'

const NO_ITEMS: ItineraryItem[] = []
const NO_DAYS: ItineraryDay[] = []

const selectClass = 'min-h-touch w-full rounded-md border border-border-strong bg-surface px-3'

function StopSelect({ id, label, value, onChange, items, days }: { id: string; label: string; value: string; onChange: (v: string) => void; items: ItineraryItem[]; days: ItineraryDay[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">Choose a stop</option>
        {days.map((d) => {
          const here = items.filter((i) => i.dayId === d.id)
          return here.length ? <optgroup key={d.id} label={`Day ${d.dayNumber}`}>{here.map((i) => <option key={i.id} value={i.id}>{i.startTime} · {i.title}</option>)}</optgroup> : null
        })}
      </select>
    </div>
  )
}

/**
 * `/trips/:id/bookings/local` — local transport estimates between two itinerary stops (`?fromItem&toItem`, which is where
 * the itinerary's "Local options" link lands and adds the choice between those two stops) or between two cities (`?from&to`).
 */
export function LocalOptions() {
  const trip = useOutletContext<TripWithState>()
  const [params, setParams] = useSearchParams()
  const plan = useTripPlan(trip.id)
  const points = useItemPoints(plan.data?.items ?? NO_ITEMS)
  const cities = params.has('from') || params.has('to') || params.get('by') === 'cities'
  const base = `/trips/${trip.id}`

  const set = (patch: Record<string, string | null>, replaceAll = false) => {
    const next = new URLSearchParams(replaceAll ? undefined : params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setParams(next, { replace: true })
  }

  const days = plan.data?.days ?? NO_DAYS
  const located = useMemo(() => {
    const order = new Map(days.map((d) => [d.id, d.dayNumber]))
    return (plan.data?.items ?? NO_ITEMS).filter((i) => points.has(i.id)).sort((a, b) => (order.get(a.dayId) ?? 0) - (order.get(b.dayId) ?? 0) || a.position - b.position)
  }, [plan.data?.items, days, points])

  const fromItem = located.find((i) => i.id === params.get('fromItem'))
  const toItem = located.find((i) => i.id === params.get('toItem'))
  const search = parseTransitParams(params, trip)

  let body
  if (cities) {
    const a = transitCity(search.from)
    const b = transitCity(search.to)
    body = search.from === search.to || !a || !b
      ? <EmptyState title="Choose two different cities" />
      : <LocalOptionsPanel key={`${a.id}-${b.id}`} trip={trip} from={{ label: a.name, point: a.centre }} to={{ label: b.name, point: b.centre }} placeId={a.id} />
  } else if (plan.isPending) {
    body = <SkeletonGroup label="Loading your stops" className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></SkeletonGroup>
  } else if (plan.isError) {
    body = <ErrorState title="Couldn’t load your itinerary" onRetry={() => void plan.refetch()} />
  } else if (located.length < 2) {
    body = <EmptyState title="Not enough stops with a location" description="Add two places to your itinerary, or compare two cities instead." />
  } else if (!fromItem || !toItem) {
    body = <EmptyState title="Choose two stops" description="Pick where you start and where you’re heading to see local options." />
  } else if (fromItem.id === toItem.id) {
    body = <EmptyState title="Choose two different stops" />
  } else {
    const dayItems = (plan.data?.items ?? NO_ITEMS).filter((i) => i.dayId === fromItem.dayId).sort((a, b) => a.position - b.position)
    const fromIdx = dayItems.findIndex((i) => i.id === fromItem.id)
    const toIdx = dayItems.findIndex((i) => i.id === toItem.id)
    const day = days.find((d) => d.id === fromItem.dayId)
    // Between two stops of one day, in order, the option goes between them. Otherwise it is added to a day of the user's choice.
    const insert = day && toItem.dayId === fromItem.dayId && fromIdx >= 0 && toIdx > fromIdx ? { dayId: day.id, dayNumber: day.dayNumber, atIndex: fromIdx + 1 } : undefined
    body = (
      <LocalOptionsPanel key={`${fromItem.id}-${toItem.id}`} trip={trip} from={{ label: fromItem.title, point: points.get(fromItem.id)! }} to={{ label: toItem.title, point: points.get(toItem.id)! }}
        placeId={day?.destinationId ?? trip.destinationIds[0]} insert={insert} />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Local options between stops</h2>
        <Link to={`${base}/bookings`} className="inline-flex min-h-touch items-center text-sm font-semibold text-primary hover:underline">Back to bookings</Link>
      </div>

      <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="space-y-4 lg:sticky lg:top-4">
          <div role="group" aria-label="Compare" className="flex flex-wrap gap-2">
            <Chip selected={!cities} onClick={() => set({ by: null, from: null, to: null })}>Between stops</Chip>
            <Chip selected={cities} onClick={() => set({ by: 'cities', fromItem: null, toItem: null })}>Between cities</Chip>
          </div>
          <form onSubmit={(e) => e.preventDefault()} aria-label="Local options search" className="grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 lg:grid-cols-1">
            {cities ? (
              (['from', 'to'] as const).map((field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label htmlFor={`lo-${field}`} className="text-sm font-medium">{field === 'from' ? 'From' : 'To'}</label>
                  <select id={`lo-${field}`} value={search[field]} onChange={(e) => set({ by: 'cities', [field]: e.target.value })} className={selectClass}>
                    {TRANSIT_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ))
            ) : (
              <>
                <StopSelect id="lo-from-item" label="From stop" value={fromItem?.id ?? ''} items={located} days={days} onChange={(v) => set({ fromItem: v || null })} />
                <StopSelect id="lo-to-item" label="To stop" value={toItem?.id ?? ''} items={located} days={days} onChange={(v) => set({ toItem: v || null })} />
              </>
            )}
          </form>
        </div>
        <div className="mt-5 min-w-0 lg:mt-0">{body}</div>
      </div>
    </div>
  )
}
