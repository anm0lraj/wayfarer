import { ArrowLeftRight, ArrowRight, Bus, MapPinned, TrainFront } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { toast } from '@/components/feedback/toast'
import { EmptyState, ErrorState, OfflineState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Badge, Chip } from '@/components/ui/Chip'
import { Input } from '@/components/ui/Input'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useRemoveBooking, useSaveBooking, useTransit } from '@/data/queries/bookings'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { cityName, transitCity, TRANSIT_CITIES } from '@/data/transitCities'
import { useOnline } from '@/lib/hooks/useOnline'
import { formatMoney } from '@/lib/money'
import type { TransitMode, TransitService } from '@/types'
import { DemoBadge } from './BookingCard'
import { duration, wall } from './flights'
import { LocalOptionsPanel } from './LocalOptionsPanel'
import { MODE_COPY, parseTransitParams, SORTS, sortServices, TIMETABLE_NOTICE, transitBookingInput } from './transit'

const selectClass = 'min-h-touch w-full rounded-md border border-border-strong bg-surface px-3'

function ServiceCard({ service: s, travellers, saved, busy, onAdd, onRemove }: { service: TransitService; travellers: number; saved: boolean; busy: boolean; onAdd: () => void; onRemove: () => void }) {
  const dep = wall(s.departAt)
  const arr = wall(s.arriveAt)
  const Icon = s.mode === 'train' ? TrainFront : Bus
  return (
    <li className="rounded-lg border border-border bg-surface p-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
      <div className="min-w-0 space-y-3">
        <p className="font-semibold">{s.name} <span className="font-normal text-fg-muted">{s.number} · {s.operator}</span></p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
          <div><p className="text-xl font-semibold">{dep.time}</p><p className="break-words text-sm text-fg-muted">{s.from.name} · {dep.date}</p></div>
          <div className="flex flex-col items-center pt-1 text-xs text-fg-muted">
            <span>{duration(s.durationMin)}</span>
            <span aria-hidden className="my-1 flex items-center gap-1"><span className="h-px w-4 bg-border sm:w-8" /><Icon className="size-3.5" /><span className="h-px w-4 bg-border sm:w-8" /></span>
            <span>Direct</span>
          </div>
          <div className="text-right"><p className="text-xl font-semibold">{arr.time}</p><p className="break-words text-sm text-fg-muted">{s.to.name} · {arr.date}</p></div>
        </div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-fg-muted"><Badge>{s.seatClass}</Badge>{s.note && <span>{s.note}</span>}</p>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:mt-0 sm:items-end sm:justify-between">
        <p className="sm:text-right">
          <span className="text-lg font-bold">{formatMoney({ ...s.price, amount: s.price.amount * travellers })}</span>
          <span className="block text-xs text-fg-muted">{travellers} traveller{travellers === 1 ? '' : 's'} · {formatMoney(s.price)} each</span>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end">
          <DemoBadge />
          {saved ? (
            <span className="flex items-center gap-2"><span role="status" className="text-sm font-semibold text-success">Saved to trip</span><Button variant="ghost" size="sm" disabled={busy} onClick={onRemove}>Remove</Button></span>
          ) : (
            <Button size="sm" disabled={busy} aria-label={`Add ${s.name} ${s.number} to trip`} onClick={onAdd}>Add {MODE_COPY[s.mode].noun} to trip</Button>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * `/trips/:id/bookings/trains` and `…/buses` — one screen for both, searched from the URL
 * (`?from=delhi&to=jaipur&date=…&travellers=2&sort=price`). Results are a sample timetable; saving one only adds a demo
 * entry to the trip. When nothing runs between the two places, local options (estimates) take over.
 */
export function TransitSearch({ mode }: { mode: TransitMode }) {
  const trip = useOutletContext<TripWithState>()
  const [params, setParams] = useSearchParams()
  const online = useOnline()
  const plan = useTripPlan(trip.id)
  const save = useSaveBooking()
  const remove = useRemoveBooking()
  const copy = MODE_COPY[mode]
  const q = useMemo(() => parseTransitParams(params, trip), [params, trip])
  const results = useTransit(mode, { from: q.from, to: q.to, date: q.date, travellers: q.travellers })
  const sorted = useMemo(() => sortServices(results.data ?? [], q.sort), [results.data, q.sort])
  const base = `/trips/${trip.id}`
  const from = transitCity(q.from)
  const to = transitCity(q.to)

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setParams(next, { replace: true })
  }
  // The URL always carries what is searched, so a shared link reproduces the results.
  const full = (patch: Partial<Record<'from' | 'to' | 'date' | 'travellers' | 'sort', string>>) =>
    set({ from: q.from, to: q.to, date: q.date, travellers: String(q.travellers), sort: q.sort, ...patch })

  const saved = new Map((plan.data?.bookings ?? []).filter((b) => b.type === mode && b.status !== 'cancelled').map((b) => [b.refId, b.id]))

  const add = (s: TransitService) =>
    save.mutate(transitBookingInput(s, trip.id, q.travellers), {
      onSuccess: (b) => toast({ title: 'Saved to trip', description: `${s.name} — not booked`, action: { label: 'Undo', onClick: () => remove.mutate(b.id) } }),
      onError: (e) => toast({ title: 'Couldn’t save it', description: e instanceof Error ? e.message : undefined }),
    })

  const filters = (
    <form onSubmit={(e) => e.preventDefault()} aria-label={`${copy.noun[0]!.toUpperCase()}${copy.noun.slice(1)} search`} className="grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 sm:grid-cols-4 lg:grid-cols-1">
      {(['from', 'to'] as const).map((field) => (
        <div key={field} className="flex flex-col gap-1.5">
          <label htmlFor={`tr-${field}`} className="text-sm font-medium">{field === 'from' ? 'From' : 'To'}</label>
          <select id={`tr-${field}`} value={q[field]} onChange={(e) => full({ [field]: e.target.value })} className={selectClass}>
            {TRANSIT_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      ))}
      <Input label="Date" type="date" value={q.date} onChange={(e) => e.target.value && full({ date: e.target.value })} />
      <Input label="Travellers" type="number" min={1} max={9} value={q.travellers} onChange={(e) => full({ travellers: String(Math.min(9, Math.max(1, Number(e.target.value) || 1))) })} />
    </form>
  )

  const noService = (
    <div className="space-y-6">
      <EmptyState
        className="py-6"
        title={`No direct ${copy.plural} found`}
        description={`The sample timetable has no direct ${copy.noun} from ${cityName(q.from)} to ${cityName(q.to)}. Here is how to get around locally instead.`}
        action={<Button asChild variant="secondary" size="sm"><Link to={`${base}/bookings/${mode === 'train' ? 'buses' : 'trains'}?${new URLSearchParams({ from: q.from, to: q.to, date: q.date, travellers: String(q.travellers) })}`}>Search {mode === 'train' ? 'buses' : 'trains'} instead</Link></Button>}
      />
      {from && to && <LocalOptionsPanel key={`${from.id}-${to.id}`} trip={trip} from={{ label: from.name, point: from.centre }} to={{ label: to.name, point: to.centre }} placeId={from.id} />}
    </div>
  )

  let content
  if (q.from === q.to) content = <EmptyState title="Choose two different places" />
  else if (results.isPending) content = <SkeletonGroup label={`Searching ${copy.plural}`} className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-40" /></SkeletonGroup>
  else if (results.isError) content = online ? <ErrorState title={`Couldn’t load ${copy.plural}`} description="Try again in a moment." onRetry={() => void results.refetch()} /> : <OfflineState description={`Searching ${copy.plural} needs a connection. Your saved trip is still available.`} />
  else if (sorted.length === 0) content = noService
  else content = (
    <section aria-label={`${copy.title} results`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="flex items-center gap-1 text-sm text-fg-muted">{sorted.length} {sorted.length === 1 ? copy.noun : copy.plural} · {cityName(q.from)} <ArrowRight aria-hidden className="size-3.5" /> {cityName(q.to)}</p>
        <div role="group" aria-label="Sort by" className="flex gap-2">
          {SORTS.map((s) => <Chip key={s.value} selected={q.sort === s.value} onClick={() => full({ sort: s.value })}>{s.label}</Chip>)}
        </div>
      </div>
      <ul className="space-y-3">
        {sorted.map((s) => (
          <ServiceCard key={s.id} service={s} travellers={q.travellers} saved={saved.has(s.id)} busy={save.isPending || remove.isPending}
            onAdd={() => add(s)} onRemove={() => { const id = saved.get(s.id); if (id) remove.mutate(id) }} />
        ))}
      </ul>
    </section>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <Link to={`${base}/bookings`} className="inline-flex min-h-touch items-center text-sm font-semibold text-primary hover:underline">Back to bookings</Link>
      </div>

      <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="space-y-3 lg:sticky lg:top-4">
          {filters}
          <Button variant="ghost" size="sm" className="w-full lg:justify-start" onClick={() => full({ from: q.to, to: q.from })}><ArrowLeftRight aria-hidden className="size-4" /> Swap places</Button>
          <p className="text-sm text-fg-muted">{TIMETABLE_NOTICE}</p>
          <Link to={`${base}/bookings/local?by=cities&from=${q.from}&to=${q.to}`} className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-primary hover:underline"><MapPinned aria-hidden className="size-4" /> Local options between stops</Link>
        </div>
        <div className="mt-5 min-w-0 lg:mt-0">{content}</div>
      </div>
    </div>
  )
}

export const TrainSearch = () => <TransitSearch mode="train" />
export const BusSearch = () => <TransitSearch mode="bus" />
