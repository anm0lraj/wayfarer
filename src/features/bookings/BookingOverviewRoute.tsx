import { Bed, Car, Plane, Plus, Ticket } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { toast } from '@/components/feedback/toast'
import { ErrorState } from '@/components/feedback/States'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useRemoveBooking, useSaveBooking } from '@/data/queries/bookings'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { zonedIso } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { BookingCard, DemoBadge } from './BookingCard'
import { bookableItems } from './bookable'
import type { Booking, ItineraryDay, ItineraryItem } from '@/types'


function Empty({ icon: Icon, text, action }: { icon: typeof Plane; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
      <p className="flex items-center gap-2 text-fg-muted"><Icon aria-hidden className="size-5" /> {text}</p>
      {action}
    </div>
  )
}

/** `/trips/:id/bookings` — everything saved to the trip, by type. All of it is demo: nothing here is purchased. */
export function BookingOverview() {
  const trip = useOutletContext<TripWithState>()
  const plan = useTripPlan(trip.id)
  const save = useSaveBooking()
  const remove = useRemoveBooking()
  const base = `/trips/${trip.id}`

  if (plan.isPending) return <SkeletonGroup label="Loading bookings" className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></SkeletonGroup>
  if (plan.isError) return <ErrorState title="Couldn’t load bookings" onRetry={() => void plan.refetch()} />

  const { bookings, items, days } = plan.data
  const active = bookings.filter((b) => b.status !== 'cancelled')
  const ofType = (t: Booking['type']) => active.filter((b) => b.type === t)
  const total = active.reduce((s, b) => s + b.price.amount, 0)
  const budget = trip.budget.total
  const currency = active[0]?.price.currency ?? budget?.currency ?? 'INR'
  const dayOf = (i: ItineraryItem): ItineraryDay | undefined => days.find((d) => d.id === i.dayId)

  const onRemove = (b: Booking) =>
    remove.mutate(b.id, {
      onSuccess: () =>
        toast({
          title: 'Removed from trip', description: b.title,
          action: { label: 'Undo', onClick: () => save.mutate({ tripId: b.tripId, type: b.type, refId: b.refId ?? b.id, title: b.title, price: b.price, startAt: b.startAt, endAt: b.endAt, details: b.details }) },
        }),
    })

  const saveItem = (i: ItineraryItem) => {
    const day = dayOf(i)
    if (!day) return
    save.mutate(
      { tripId: trip.id, type: i.category === 'transport' ? 'transport' : 'activity', refId: i.id, title: i.title, price: i.estimatedCost ?? { amount: 0, currency }, startAt: zonedIso(day.date, i.startTime, trip.timezone), details: { itemId: i.id, dayNumber: day.dayNumber } },
      { onSuccess: () => toast({ title: 'Saved to trip', description: `${i.title} — not booked` }) },
    )
  }

  const suggestions = bookableItems(items, bookings)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 p-4">
        <div>
          <p className="text-sm text-fg-muted">Saved to this trip</p>
          <p className="text-2xl font-bold">{formatMoney({ amount: total, currency })}</p>
          {budget ? <p className="text-sm text-fg-muted">of {formatMoney(budget)} budget, before food and activities</p> : null}
        </div>
        <div className="max-w-sm text-sm text-fg-muted">
          <DemoBadge />
          <p className="mt-1.5">These are plan entries. Nothing here has been purchased or reserved with a provider.</p>
        </div>
      </div>

      <Section title="Flights">
        {ofType('flight').length ? <ul className="space-y-2">{ofType('flight').map((b) => <BookingCard key={b.id} tz={trip.timezone} booking={b} onRemove={onRemove} removing={remove.isPending} />)}</ul> : <Empty icon={Plane} text="No flights saved yet." />}
        <Button asChild variant="secondary" size="sm"><Link to={`${base}/bookings/flights`}><Plus aria-hidden className="size-4" /> Find flights</Link></Button>
      </Section>

      <Section title="Hotels">
        {ofType('hotel').length ? <ul className="space-y-2">{ofType('hotel').map((b) => <BookingCard key={b.id} tz={trip.timezone} booking={b} onRemove={onRemove} removing={remove.isPending} />)}</ul> : <Empty icon={Bed} text="No stay saved yet." />}
        <Button asChild variant="secondary" size="sm"><Link to={`${base}/bookings/hotels`}><Plus aria-hidden className="size-4" /> Find a hotel</Link></Button>
      </Section>

      <Section title="Activities" description="Experiences from your itinerary you may want to reserve">
        {ofType('activity').length > 0 && <ul className="space-y-2">{ofType('activity').map((b) => <BookingCard key={b.id} tz={trip.timezone} booking={b} onRemove={onRemove} removing={remove.isPending} />)}</ul>}
        <Suggestions label="Activities from your itinerary" items={suggestions.filter((i) => i.category === 'activity')} dayOf={dayOf} onSave={saveItem} busy={save.isPending} empty={ofType('activity').length === 0 ? { icon: Ticket, text: 'No bookable activities in your itinerary yet.' } : undefined} />
      </Section>

      <Section title="Transport" description="Transfers and rides from your itinerary">
        {ofType('transport').length > 0 && <ul className="space-y-2">{ofType('transport').map((b) => <BookingCard key={b.id} tz={trip.timezone} booking={b} onRemove={onRemove} removing={remove.isPending} />)}</ul>}
        <Suggestions label="Transport from your itinerary" items={suggestions.filter((i) => i.category === 'transport')} dayOf={dayOf} onSave={saveItem} busy={save.isPending} empty={ofType('transport').length === 0 ? { icon: Car, text: 'No paid transport in your itinerary yet.' } : undefined} />
      </Section>
    </div>
  )
}

function Suggestions({ label, items, dayOf, onSave, busy, empty }: {
  label: string
  items: ItineraryItem[]
  dayOf: (i: ItineraryItem) => ItineraryDay | undefined
  onSave: (i: ItineraryItem) => void
  busy: boolean
  empty?: { icon: typeof Plane; text: string }
}) {
  if (!items.length) return empty ? <Empty icon={empty.icon} text={empty.text} /> : null
  return (
    <ul aria-label={label} className="divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((i) => (
        <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="font-medium">{i.title}</p>
            <p className="text-sm text-fg-muted">Day {dayOf(i)?.dayNumber} · {i.startTime}{i.estimatedCost ? ` · ${formatMoney(i.estimatedCost)}` : ''}</p>
          </div>
          <Button variant="secondary" size="sm" disabled={busy} aria-label={`Save ${i.title} to trip`} onClick={() => onSave(i)}>Save to trip</Button>
        </li>
      ))}
    </ul>
  )
}
