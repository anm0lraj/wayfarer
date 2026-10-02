import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, ChevronRight, Footprints, MapPin, Navigation, Phone, Play, SkipForward } from 'lucide-react'
import { toast } from '@/components/feedback/toast'
import { EmptyState } from '@/components/feedback/States'
import { WeatherChip } from '@/components/domain/WeatherChip'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { Card } from '@/components/ui/Card'
import { useHotel } from '@/data/queries/bookings'
import { useDestination } from '@/data/queries/catalog'
import type { TripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { useForecast } from '@/data/queries/weather'
import { CATEGORY_META } from '@/features/itinerary/categoryMeta'
import { useItemPoints } from '@/features/map/useMapData'
import { useItineraryActions } from '@/features/itinerary/useItineraryActions'
import { currentDayNumber } from '@/features/trips/tripState'
import { announce } from '@/lib/a11y/announce'
import { dateInTimezone } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'
import { cn } from '@/lib/cn'
import { useServices } from '@/services'
import type { ItemStatus } from '@/types'
import { EmergencySheet } from './EmergencySheet'
import { LocationCard } from './LocationCard'
import { StatusSheet } from './StatusSheet'
import { STATUS_ICON } from './statusIcons'
import {
  ARRIVED_KM, STATUS_LABEL, formatClock, greetingFor, humanMinutes, isNear, liveItems, liveSnapshot, minutesUntil, type LiveItem,
} from './liveStatus'
import { useLiveLocation } from './useLiveLocation'

const statusTone = { upcoming: 'neutral', on_the_way: 'primary', in_progress: 'warning', completed: 'success', skipped: 'neutral' } as const

function StatusBadge({ live }: { live: LiveItem }) {
  const Icon = STATUS_ICON[live.status]
  const label = live.overdue ? 'Time has passed' : STATUS_LABEL[live.status]
  return <Badge tone={live.overdue ? 'warning' : statusTone[live.status]}><Icon aria-hidden className="size-3.5" />{label}</Badge>
}

/** `/trips/:id/live` once the trip is active: glanceable, large type, one-handed. */
export function LiveDashboard({ trip, plan }: { trip: TripWithState; plan: TripPlan }) {
  const now = useNow()
  const { maps } = useServices()
  const actions = useItineraryActions(trip.id)
  const location = useLiveLocation()
  const [statusFor, setStatusFor] = useState<string>()
  const [emergencyOpen, setEmergencyOpen] = useState(false)

  const dayNumber = currentDayNumber(trip, now)
  const day = plan.days.find((d) => d.dayNumber === dayNumber)
  const dayItems = useMemo(() => plan.items.filter((i) => i.dayId === day?.id), [plan.items, day?.id])
  const points = useItemPoints(dayItems)
  const destination = useDestination(day?.destinationId ?? trip.destinationIds[0]).data
  const today = dateInTimezone(now, trip.timezone)
  const weather = useForecast(destination?.location, today, today).data?.[0]

  const list = useMemo(() => liveItems(dayItems, day?.date ?? today, trip.timezone, now), [dayItems, day?.date, today, trip.timezone, now])
  const snap = useMemo(() => liveSnapshot(list), [list])
  const stay = plan.bookings.find((b) => b.type === 'hotel')
  const stayHotel = useHotel(stay?.refId).data

  const setStatus = (item: LiveItem['item'], status: ItemStatus) => {
    const previous = item.status
    void actions.update(item.id, { status })
    announce(`${item.title} marked ${STATUS_LABEL[status].toLowerCase()}`)
    if (status === 'completed' || status === 'skipped') {
      toast({ title: `${item.title} ${status === 'completed' ? 'done' : 'skipped'}`, action: { label: 'Undo', onClick: () => void actions.update(item.id, { status: previous }) } })
    }
  }

  if (!day || dayItems.length === 0) {
    return (
      <EmptyState
        title="Nothing planned for today"
        description="Enjoy the free time, or add something to do."
        action={<Button asChild><Link to={`/trips/${trip.id}/itinerary${day ? `/day/${day.dayNumber}` : ''}`}>Open itinerary</Link></Button>}
      />
    )
  }

  const focus = snap.current ?? snap.next
  const focusPoint = focus ? points.get(focus.item.id) : undefined
  const nextPoint = snap.next ? points.get(snap.next.item.id) : undefined
  const place = destination ? `${destination.name}` : trip.title
  const firstUntouched = snap.done.length === 0 && !snap.current && snap.next && list[0] === snap.next
  const allDone = snap.remaining.length === 0
  // Location-based progress is only ever a suggestion the traveller confirms.
  const arrived =
    location.state.kind === 'on' && snap.next && nextPoint && snap.next.status !== 'in_progress' && isNear(location.state.point, nextPoint, ARRIVED_KM)
      ? snap.next
      : undefined

  return (
    <div className="space-y-5">
      <header>
        <p className="flex items-center gap-2 text-fg-muted"><MapPin aria-hidden className="size-4" /> Live trip · Day {day.dayNumber} of {plan.days.length}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">You’re in {place}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-lg text-fg-muted">
          <span>{firstUntouched && snap.next ? `${greetingFor(now, trip.timezone)}. Your first activity starts at ${formatClock(snap.next.item.startTime)}.` : allDone ? 'All done for today.' : `${greetingFor(now, trip.timezone)}.`}</span>
          {weather && <span className="inline-flex items-center gap-2"><WeatherChip condition={weather.condition} tempC={weather.highC} />{weather.rainChancePct >= 40 && <span>{weather.rainChancePct}% rain</span>}</span>}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-5">
          {arrived && (
            <Card className="flex flex-wrap items-center justify-between gap-3 border-primary p-4" role="status">
              <span>You look to be at <strong>{arrived.item.title}</strong>.</span>
              <Button size="sm" onClick={() => setStatus(arrived.item, 'in_progress')}>Start it</Button>
            </Card>
          )}

          {focus && (
            <Card className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{snap.current ? 'Happening now' : 'Next up'}</h2>
                <StatusBadge live={focus} />
              </div>
              <div>
                <p className="text-2xl font-bold sm:text-3xl">{focus.item.title}</p>
                <p className="mt-1 text-lg text-fg-muted">
                  {formatClock(focus.item.startTime)}
                  {snap.current ? ` · ends in ${humanMinutes(minutesUntil(focus.end, now))}` : ` · in ${humanMinutes(minutesUntil(focus.start, now))}`}
                </p>
                {focus.item.travelTimeFromPrevMin !== undefined && !snap.current && (
                  <p className="text-fg-muted">About {humanMinutes(focus.item.travelTimeFromPrevMin)} from your previous stop</p>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {!snap.current && focusPoint && (
                  <Button asChild size="lg" className="sm:col-span-2">
                    <a href={maps.links.deepLink(focusPoint, 'directions', focus.item.title)} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden className="size-5" /> Navigate to Next</a>
                  </Button>
                )}
                {!snap.current && !focusPoint && <Button size="lg" disabled className="sm:col-span-2"><Navigation aria-hidden className="size-5" /> No location for this stop</Button>}
                {snap.current && focus === snap.current && (
                  <Button size="lg" onClick={() => setStatus(focus.item, 'completed')}><Check aria-hidden className="size-5" /> Mark done</Button>
                )}
                {!snap.current && (
                  <Button size="lg" variant="secondary" onClick={() => setStatus(focus.item, focus.status === 'on_the_way' ? 'in_progress' : 'on_the_way')}>
                    {focus.status === 'on_the_way' ? <><Play aria-hidden className="size-5" /> I’ve arrived</> : <><Footprints aria-hidden className="size-5" /> I’m on my way</>}
                  </Button>
                )}
                <Button size="lg" variant="secondary" onClick={() => setStatus(focus.item, 'skipped')}><SkipForward aria-hidden className="size-5" /> Skip</Button>
              </div>
            </Card>
          )}

          {allDone && (
            <Card className="p-5 text-center"><p className="text-lg font-semibold">That’s everything for today.</p><p className="text-fg-muted">Tomorrow’s plan is in your itinerary.</p></Card>
          )}

          {snap.current && snap.next && (
            <Card className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Up next: {snap.next.item.title}</h2>
                <span className="text-fg-muted">{formatClock(snap.next.item.startTime)}</span>
              </div>
              {nextPoint && (
                <Button asChild variant="secondary"><a href={maps.links.deepLink(nextPoint, 'directions', snap.next.item.title)} target="_blank" rel="noopener noreferrer"><Navigation aria-hidden className="size-4" /> Navigate to Next</a></Button>
              )}
            </Card>
          )}

          {snap.overdue.length > 0 && (
            <Card className="space-y-2 border-warning p-4" role="status">
              <h2 className="font-semibold">Still marked upcoming</h2>
              <p className="text-fg-muted">The time has passed for {snap.overdue.length === 1 ? 'this activity' : 'these activities'}. Mark {snap.overdue.length === 1 ? 'it' : 'them'} done or skipped to keep your plan accurate.</p>
              <ul className="divide-y divide-border">
                {snap.overdue.map((l) => (
                  <li key={l.item.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0 font-medium">{l.item.title}</span>
                    <span className="flex gap-2">
                      <Button size="sm" variant="secondary" aria-label={`Mark ${l.item.title} done`} onClick={() => setStatus(l.item, 'completed')}>Done</Button>
                      <Button size="sm" variant="ghost" aria-label={`Skip ${l.item.title}`} onClick={() => setStatus(l.item, 'skipped')}>Skip</Button>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <section aria-labelledby="today-h">
            <h2 id="today-h" className="mb-2 text-xl font-semibold">Today — Day {day.dayNumber}{day.title ? `: ${day.title}` : ''}</h2>
            <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
              {list.map((l) => {
                const meta = CATEGORY_META[l.item.category]
                const isFocus = l === focus
                return (
                  <li key={l.item.id}>
                    <button
                      type="button"
                      onClick={() => setStatusFor(l.item.id)}
                      aria-label={`${formatClock(l.item.startTime)} ${l.item.title}, ${l.overdue ? 'time has passed' : STATUS_LABEL[l.status].toLowerCase()}. Change status`}
                      className={cn('flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2', isFocus && 'bg-primary/5')}
                    >
                      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', meta.tone)}><meta.icon aria-hidden className="size-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-lg font-medium', (l.status === 'completed' || l.status === 'skipped') && 'text-fg-muted line-through')}>{l.item.title}</span>
                        <span className="block text-fg-muted">{formatClock(l.item.startTime)}</span>
                      </span>
                      <StatusBadge live={l} />
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-muted" />
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>

        <aside aria-label="Trip tools" className="space-y-4">
          <LocationCard
            state={location.state}
            onEnable={() => void location.enable()}
            onDisable={location.disable}
            target={snap.next && nextPoint ? { name: snap.next.item.title, point: nextPoint } : undefined}
          />
          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Emergency information</h2>
            <p className="text-fg-muted">Local emergency numbers and where you’re staying — saved on this device.</p>
            <Button variant="secondary" onClick={() => setEmergencyOpen(true)}><Phone aria-hidden className="size-4" /> Open emergency info</Button>
          </Card>
          <Button asChild variant="secondary" className="w-full"><Link to={`/trips/${trip.id}/memories/new${snap.current ? `?item=${snap.current.item.id}` : ""}`}><Camera aria-hidden className="size-4" /> Add memory</Link></Button>
          <Button asChild variant="ghost" className="w-full"><Link to={`/trips/${trip.id}/itinerary/day/${day.dayNumber}`}>View full itinerary</Link></Button>
        </aside>
      </div>

      <StatusSheet live={list.find((l) => l.item.id === statusFor)} onClose={() => setStatusFor(undefined)} onChange={setStatus} />
      <EmergencySheet
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        country={destination?.country}
        stay={stay ? { name: stay.title, address: stayHotel?.address } : undefined}
      />
    </div>
  )
}
