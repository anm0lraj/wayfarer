import { Bike, BusFront, Car, CarTaxiFront, Plane, Smartphone, TramFront, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import type { LocalMode } from '@/data/fares'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { useItineraryActions } from '@/features/itinerary/useItineraryActions'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/money'
import type { GeoPoint } from '@/types'
import { fareRangeText, insertStartTime, localOptions, localOptionStop, minutesText, type LocalOption } from './localTransport'

const ICONS: Record<LocalMode, LucideIcon> = { cab: CarTaxiFront, auto: Car, ride_hailing: Smartphone, scooter: Bike, metro: TramFront, city_bus: BusFront }

export interface LocalEndpoint {
  label: string
  point: GeoPoint
}
/** Where an added option goes when it must sit between two particular stops. */
export interface LocalInsert {
  dayId: string
  dayNumber: number
  atIndex: number
}

interface PanelProps {
  trip: TripWithState
  from: LocalEndpoint
  to: LocalEndpoint
  /** Destination or transit-city id: picks the fare table. */
  placeId: string | undefined
  insert?: LocalInsert
}

function OptionRow({ option, added, busy, addLabel, onAdd }: { option: LocalOption; added: boolean; busy: boolean; addLabel: string; onAdd: () => void }) {
  const Icon = ICONS[option.mode]
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-5" /></span>
          <div className="min-w-0">
            <h4 className="font-semibold">{option.label}</h4>
            {option.note && <p className="text-sm text-fg-muted">{option.note}</p>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold">{fareRangeText(option, formatMoney)}</p>
          <p className="text-sm text-fg-muted">about {minutesText(option.minutes)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="neutral">Estimate</Badge>
        {added ? (
          <span role="status" className="text-sm font-semibold text-success">Added to itinerary</span>
        ) : (
          <Button variant="secondary" size="sm" disabled={busy} aria-label={`Add ${option.label} to itinerary`} onClick={onAdd}>{addLabel}</Button>
        )}
      </div>
    </li>
  )
}

/**
 * Local options between two points: cab, auto, ride-hailing, scooter, metro, city bus — each an estimate from
 * bundled sample fares, never a quote and never bookable. Adding one puts a `transport` stop in the itinerary
 * (no booking is created). Remount it (`key`) when the points change.
 */
export function LocalOptionsPanel({ trip, from, to, placeId, insert }: PanelProps) {
  const plan = useTripPlan(trip.id)
  const actions = useItineraryActions(trip.id)
  const [added, setAdded] = useState<Set<LocalMode>>(new Set())
  const [busy, setBusy] = useState(false)
  const [dayId, setDayId] = useState<string>()
  const estimate = useMemo(() => localOptions(from.point, to.point, placeId), [from.point, to.point, placeId])
  const days = plan.data?.days ?? []
  const chosenDay = insert ? days.find((d) => d.id === insert.dayId) : days.find((d) => d.id === dayId) ?? days[0]

  const add = async (o: LocalOption) => {
    if (!chosenDay) return
    const dayItems = (plan.data?.items ?? []).filter((i) => i.dayId === chosenDay.id).sort((a, b) => a.position - b.position)
    const atIndex = insert?.atIndex
    setBusy(true)
    const item = await actions.add(chosenDay.id, chosenDay.dayNumber, localOptionStop(o, from.label, to.label, insertStartTime(dayItems, atIndex ?? dayItems.length)), atIndex)
    setBusy(false)
    if (item) setAdded((prev) => new Set(prev).add(o.mode))
  }

  return (
    <section aria-label="Local options" className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Local options</h3>
        <p className="text-sm text-fg-muted">{from.label} to {to.label} · about {estimate.roadKm} km by road (estimated from the distance between the two points)</p>
      </div>

      {estimate.tooFar ? (
        <div role="status" className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <p className="font-semibold">Too far for local transport</p>
          <p className="text-sm text-fg-muted">About {estimate.roadKm} km by road is more than a cab or bus ride around town. A flight, train or intercity bus is the better fit.</p>
          <Button asChild variant="secondary" size="sm"><Link to={`/trips/${trip.id}/bookings/flights`}><Plane aria-hidden className="size-4" /> Look at flights</Link></Button>
        </div>
      ) : (
        <>
          {!insert && days.length > 1 && (
            <div className="flex max-w-xs flex-col gap-1.5">
              <label htmlFor="local-day" className="text-sm font-medium">Add to day</label>
              <select id="local-day" value={chosenDay?.id ?? ''} onChange={(e) => { setDayId(e.target.value); setAdded(new Set()) }} className="min-h-touch rounded-md border border-border-strong bg-surface px-3">
                {days.map((d) => <option key={d.id} value={d.id}>Day {d.dayNumber}{d.title ? ` · ${d.title}` : ''}</option>)}
              </select>
            </div>
          )}
          <ul className={cn('grid gap-3', estimate.options.length > 1 && 'sm:grid-cols-2 xl:grid-cols-3')}>
            {estimate.options.map((o) => (
              <OptionRow key={o.mode} option={o} added={added.has(o.mode)} busy={busy || !chosenDay}
                addLabel={chosenDay ? `Add to Day ${chosenDay.dayNumber}` : 'Add to itinerary'} onAdd={() => void add(o)} />
            ))}
          </ul>
        </>
      )}

      <p className="text-sm text-fg-muted">
        Estimates from approximate sample fares, not quotes. Real prices vary with time of day, traffic and bargaining. Nothing here can be booked, and adding an option to your itinerary does not book anything.
      </p>
    </section>
  )
}
