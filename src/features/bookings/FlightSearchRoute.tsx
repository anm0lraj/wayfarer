import { ArrowRight, Plane } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { toast } from '@/components/feedback/toast'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useFlights, useRemoveBooking, useSaveBooking } from '@/data/queries/bookings'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { formatMoney } from '@/lib/money'
import { DemoBadge } from './BookingCard'
import { flightDefaults, type FlightLeg } from './flights'
import type { Flight } from '@/types'

const AIRPORTS = [
  { code: 'BOM', label: 'Mumbai (BOM)' }, { code: 'DEL', label: 'Delhi (DEL)' }, { code: 'BLR', label: 'Bengaluru (BLR)' }, { code: 'DPS', label: 'Bali (DPS)' },
]

/** Wall-clock parts straight from the ISO string, which carries the airport's own offset — so no timezone maths. */
const wall = (iso: string) => ({ date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)), time: iso.slice(11, 16) })
const duration = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`

function FlightCard({ flight, travellers, saved, busy, onAdd, onRemove }: { flight: Flight; travellers: number; saved: boolean; busy: boolean; onAdd: () => void; onRemove: () => void }) {
  const dep = wall(flight.departAt)
  const arr = wall(flight.arriveAt)
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{flight.airline} <span className="font-normal text-fg-muted">{flight.flightNumber}</span></p>
        <p className="text-right"><span className="text-lg font-bold">{formatMoney({ ...flight.price, amount: flight.price.amount * travellers })}</span><span className="block text-xs text-fg-muted">{travellers} traveller{travellers === 1 ? '' : 's'} · {formatMoney(flight.price)} each</span></p>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div><p className="text-xl font-semibold">{dep.time}</p><p className="text-sm text-fg-muted">{flight.from.code} · {dep.date}</p></div>
        <div className="flex min-w-0 flex-1 flex-col items-center text-xs text-fg-muted">
          <span>{duration(flight.durationMin)}</span>
          <span aria-hidden className="my-1 flex w-full items-center gap-1"><span className="h-px flex-1 bg-border" /><Plane className="size-3.5" /><span className="h-px flex-1 bg-border" /></span>
          <span>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops === 1 ? '' : 's'}`}</span>
        </div>
        <div className="text-right"><p className="text-xl font-semibold">{arr.time}</p><p className="text-sm text-fg-muted">{flight.to.code} · {arr.date}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <DemoBadge />
        {saved ? (
          <span className="flex items-center gap-2"><span role="status" className="text-sm font-semibold text-success">Saved to trip</span><Button variant="ghost" size="sm" disabled={busy} onClick={onRemove}>Remove</Button></span>
        ) : (
          <Button size="sm" disabled={busy} aria-label={`Add ${flight.airline} ${flight.flightNumber} to trip`} onClick={onAdd}>Add flight to trip</Button>
        )}
      </div>
    </li>
  )
}

/** `/trips/:id/bookings/flights` — outbound and return legs, searched from the URL (`?leg=return&from=DPS&to=BOM&date=…`). */
export function FlightSearch() {
  const trip = useOutletContext<TripWithState>()
  const [params, setParams] = useSearchParams()
  const plan = useTripPlan(trip.id)
  const save = useSaveBooking()
  const remove = useRemoveBooking()
  const leg: FlightLeg = params.get('leg') === 'return' ? 'return' : 'outbound'
  const defaults = useMemo(() => flightDefaults(trip, leg), [trip, leg])
  const from = params.get('from') || defaults.from
  const to = params.get('to') || defaults.to
  const date = params.get('date') || defaults.date
  const travellers = Number(params.get('travellers')) > 0 ? Number(params.get('travellers')) : trip.travellers.count
  const flights = useFlights({ from, to, date, travellers })

  const set = (patch: Record<string, string | null>, replaceAll = false) => {
    const next = new URLSearchParams(replaceAll ? undefined : params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setParams(next, { replace: true })
  }
  const saved = new Map((plan.data?.bookings ?? []).filter((b) => b.type === 'flight' && b.status !== 'cancelled').map((b) => [b.refId, b.id]))

  const add = (f: Flight) =>
    save.mutate(
      {
        tripId: trip.id, type: 'flight', refId: f.id, title: `${f.airline} ${f.flightNumber} · ${f.from.code} → ${f.to.code}`,
        price: { ...f.price, amount: f.price.amount * travellers }, startAt: f.departAt, endAt: f.arriveAt,
        details: { flightId: f.id, travellers, from: f.from, to: f.to, durationMin: f.durationMin, stops: f.stops, cabin: f.cabin },
      },
      {
        onSuccess: (b) => toast({ title: 'Saved to trip', description: `${f.flightNumber} — not booked`, action: { label: 'Undo', onClick: () => remove.mutate(b.id) } }),
        onError: (e) => toast({ title: 'Couldn’t save it', description: e instanceof Error ? e.message : undefined }),
      },
    )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Flights</h2>
        <Link to={`/trips/${trip.id}/bookings`} className="inline-flex min-h-touch items-center text-sm font-semibold text-primary hover:underline">Back to bookings</Link>
      </div>

      <div role="group" aria-label="Trip leg" className="flex gap-2">
        <Chip selected={leg === 'outbound'} onClick={() => set({ leg: null, from: null, to: null, date: null }, true)}>Outbound</Chip>
        <Chip selected={leg === 'return'} onClick={() => set({ leg: 'return', from: null, to: null, date: null }, true)}>Return</Chip>
      </div>

      <form onSubmit={(e) => e.preventDefault()} aria-label="Flight search" className="grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 lg:grid-cols-4">
        {(['from', 'to'] as const).map((field) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label htmlFor={`fl-${field}`} className="text-sm font-medium">{field === 'from' ? 'From' : 'To'}</label>
            <select id={`fl-${field}`} value={field === 'from' ? from : to} onChange={(e) => set({ [field]: e.target.value })} className="min-h-touch rounded-md border border-border-strong bg-surface px-3">
              {AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
            </select>
          </div>
        ))}
        <Input label="Date" type="date" value={date} onChange={(e) => set({ date: e.target.value })} />
        <Input label="Travellers" type="number" min={1} max={9} value={travellers} onChange={(e) => set({ travellers: String(Math.max(1, Number(e.target.value) || 1)) })} />
      </form>

      {from === to ? (
        <EmptyState title="Choose two different airports" />
      ) : flights.isPending ? (
        <SkeletonGroup label="Searching flights" className="space-y-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></SkeletonGroup>
      ) : flights.isError ? (
        <ErrorState title="Couldn’t load flights" description="Check your connection and try again." onRetry={() => void flights.refetch()} />
      ) : flights.data.length === 0 ? (
        <EmptyState title="No flights found" description="The demo only has Mumbai ⇄ Bali on the trip dates. Try those, or another date." />
      ) : (
        <section aria-label="Flight results" className="space-y-3">
          <p role="status" className="flex items-center gap-1 text-sm text-fg-muted">{flights.data.length} flights · {from} <ArrowRight aria-hidden className="size-3.5" /> {to}</p>
          <ul className="space-y-3">
            {flights.data.map((f) => (
              <FlightCard key={f.id} flight={f} travellers={travellers} saved={saved.has(f.id)} busy={save.isPending || remove.isPending}
                onAdd={() => add(f)} onRemove={() => { const id = saved.get(f.id); if (id) remove.mutate(id) }} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
