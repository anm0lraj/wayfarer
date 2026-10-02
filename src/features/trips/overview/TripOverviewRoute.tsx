import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight, Radio } from 'lucide-react'
import { ErrorState } from '@/components/feedback/States'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useTripPlan, type TripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { INTEREST_LABELS } from '../create/interestLabels'
import { currentDayNumber } from '../tripState'
import { countdownLabel, dateInTimezone, formatDateRange } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'
import { formatMoney } from '@/lib/money'
import { OfflineCard } from '@/features/offline/OfflineCard'
import { PushPermissionCard } from '@/features/notifications/PushPermissionCard'
import { TripActions } from './TripActions'

function StatePanel({ trip, plan }: { trip: TripWithState; plan: TripPlan }) {
  const now = useNow()
  const base = `/trips/${trip.id}`
  const countdown = countdownLabel(trip.startDate, dateInTimezone(now, trip.timezone))
  const day = currentDayNumber(trip, now)

  switch (trip.effectiveState) {
    case 'draft':
      return (
        <Card className="space-y-3 p-5">
          <h2 className="text-xl font-semibold">Start planning</h2>
          <p className="text-fg-muted">Your days are empty. Add your first stop, or let the assistant suggest a draft.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to={`${base}/itinerary/day/1`}>Add your first activity</Link></Button>
            <Button asChild variant="secondary"><Link to={`${base}/ai`}>Ask the AI assistant</Link></Button>
          </div>
        </Card>
      )
    case 'planning':
      return (
        <Card className="space-y-4 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">Planning {plan.progress.percent}% complete</h2>
            {countdown && <span className="text-sm font-semibold text-primary">{countdown}</span>}
          </div>
          <ProgressBar value={plan.progress.percent} label={`Planning ${plan.progress.percent}% complete`} />
          <TaskList tasks={plan.progress.tasks} />
        </Card>
      )
    case 'ready':
    case 'upcoming':
      return (
        <Card className="space-y-4 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">{trip.effectiveState === 'upcoming' ? countdown || 'Coming up' : 'You’re set'}</h2>
            <Badge tone="success">{plan.progress.percent}% planned</Badge>
          </div>
          <p className="text-fg-muted">Get ready: check your documents, packing and anything still missing.</p>
          <TaskList tasks={plan.progress.tasks} />
          <Button asChild variant="secondary"><Link to={`${base}/checklist`}>Open trip checklist</Link></Button>
        </Card>
      )
    case 'active':
      return (
        <Card className="space-y-3 border-secondary/40 bg-secondary/10 p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Radio aria-hidden className="size-5 text-secondary motion-safe:animate-pulse" /> Your trip is live{day ? ` — Day ${day}` : ''}</h2>
          <p className="text-fg-muted">Live Trip shows today’s plan, the next stop and directions in one simple view.</p>
          <Button asChild size="lg"><Link to={`${base}/live`}>Open Live Trip <ArrowRight aria-hidden className="size-5" /></Link></Button>
        </Card>
      )
    case 'completed':
      return (
        <Card className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><CheckCircle2 aria-hidden className="size-5 text-success" /> Your {trip.title} is complete</h2>
          <p className="text-fg-muted">Turn your memories into a shareable trip?</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to={`${base}/share`}>Share this trip</Link></Button>
            <Button asChild variant="secondary"><Link to={`${base}/memories`}>See memories</Link></Button>
          </div>
        </Card>
      )
    case 'archived':
      return <Card className="p-5"><h2 className="text-xl font-semibold">Archived</h2><p className="mt-1 text-fg-muted">This trip is hidden from your main list. Restore it from Trip options below.</p></Card>
  }
}

function TaskList({ tasks }: { tasks: TripPlan['progress']['tasks'] }) {
  if (tasks.length === 0) return <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 aria-hidden className="size-4" /> Everything is planned.</p>
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link to={t.to} className="flex min-h-touch items-center justify-between gap-3 px-3 py-2.5 font-medium hover:bg-surface-2">
            {t.label}<ChevronRight aria-hidden className="size-4 text-fg-muted" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Costs({ trip, plan }: { trip: TripWithState; plan: TripPlan }) {
  const sum = (amounts: number[]) => amounts.reduce((a, b) => a + b, 0)
  const activities = sum(plan.items.map((i) => i.estimatedCost?.amount ?? 0))
  const hotels = sum(plan.bookings.filter((b) => b.type === 'hotel' && b.status !== 'cancelled').map((b) => b.price.amount))
  const flights = sum(plan.bookings.filter((b) => b.type === 'flight' && b.status !== 'cancelled').map((b) => b.price.amount))
  const total = activities + hotels + flights
  const budget = trip.budget.total?.amount
  const rows: Array<[string, number]> = [['Activities & food', activities], ['Stays', hotels], ['Flights', flights]]
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-baseline justify-between"><h3 className="font-semibold">Estimated cost</h3><span className="text-lg font-semibold">{formatMoney({ amount: total, currency: 'INR' })}</span></div>
      {budget ? (
        <>
          <ProgressBar value={(total / budget) * 100} label={`${Math.round((total / budget) * 100)}% of budget`} className={total > budget ? '[&>div]:bg-error' : ''} />
          <p className={`text-sm ${total > budget ? 'font-medium text-error' : 'text-fg-muted'}`}>
            {total > budget ? `${formatMoney({ amount: total - budget, currency: 'INR' })} over` : `${formatMoney({ amount: budget - total, currency: 'INR' })} left of`} your {formatMoney(trip.budget.total!)} budget
          </p>
        </>
      ) : <p className="text-sm text-fg-muted">No total budget set.</p>}
      <dl className="space-y-1 text-sm">
        {rows.map(([label, amount]) => <div key={label} className="flex justify-between"><dt className="text-fg-muted">{label}</dt><dd>{formatMoney({ amount, currency: 'INR' })}</dd></div>)}
      </dl>
      <p className="text-xs text-fg-muted">Flights and stays are saved to the trip as demo entries — nothing is booked.</p>
    </Card>
  )
}

export function TripOverview() {
  const trip = useOutletContext<TripWithState>()
  const plan = useTripPlan(trip.id)
  const justCreated = (useLocation().state as { justCreated?: boolean } | null)?.justCreated === true
  const base = `/trips/${trip.id}`

  if (plan.isPending) return <SkeletonGroup label="Loading overview" className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></SkeletonGroup>
  if (plan.isError) return <ErrorState title="Couldn’t load this trip’s plan" onRetry={() => void plan.refetch()} />
  const { days, items, bookings } = plan.data
  const hotel = bookings.find((b) => b.type === 'hotel' && b.status !== 'cancelled')
  const flights = bookings.filter((b) => b.type === 'flight' && b.status !== 'cancelled')

  return (
    <div className="space-y-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0">
      <div className="min-w-0 space-y-8 lg:col-span-8">
        {justCreated && <PushPermissionCard />}
        <StatePanel trip={trip} plan={plan.data} />

        <Section title="Day by day" to={`${base}/itinerary`} linkLabel="Open itinerary">
          <ul className="grid gap-3 sm:grid-cols-2">
            {days.map((d) => {
              const list = items.filter((i) => i.dayId === d.id).sort((a, b) => a.position - b.position)
              return (
                <li key={d.id}>
                  <Link to={`${base}/itinerary/day/${d.dayNumber}`} className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold">Day {d.dayNumber}{d.title ? ` · ${d.title}` : ''}</h3>
                      <span className="shrink-0 text-xs text-fg-muted">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-sm text-fg-muted">Nothing planned yet — add an activity.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {list.slice(0, 3).map((i) => <li key={i.id} className="flex gap-2"><span className="w-11 shrink-0 text-fg-muted tabular-nums">{i.startTime}</span><span className="truncate">{i.title}</span></li>)}
                        {list.length > 3 && <li className="text-fg-muted">+{list.length - 3} more</li>}
                      </ul>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </Section>
      </div>

      <aside className="min-w-0 space-y-6 lg:col-span-4">
        <Costs trip={trip} plan={plan.data} />
        <OfflineCard trip={trip} />

        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Bookings</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-2"><span className="text-fg-muted">Stay</span>{hotel ? <span className="truncate font-medium">{hotel.title}</span> : <Link className="font-semibold text-primary" to={`${base}/bookings/hotels`}>Add accommodation</Link>}</li>
            <li className="flex items-center justify-between gap-2"><span className="text-fg-muted">Flights</span>{flights.length ? <span className="font-medium">{flights.length} saved</span> : <Link className="font-semibold text-primary" to={`${base}/bookings/flights`}>Add flights</Link>}</li>
          </ul>
          {(hotel || flights.length > 0) && <Badge tone="warning">Saved to trip — not booked</Badge>}
          <Link to={`${base}/bookings`} className="inline-flex min-h-touch items-center gap-1 text-sm font-semibold text-primary">All bookings <ChevronRight aria-hidden className="size-4" /></Link>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Trip details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Dates</dt><dd className="font-medium">{formatDateRange(trip.startDate, trip.endDate)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Travellers</dt><dd className="font-medium capitalize">{trip.travellers.count} · {trip.travellers.group}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Budget style</dt><dd className="font-medium capitalize">{trip.budget.tier}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-fg-muted">Planning</dt><dd className="font-medium">{{ ai: 'AI planned', manual: 'Manual', hybrid: 'AI + manual' }[trip.planningStyle]}</dd></div>
          </dl>
          {trip.interests.length > 0 && <div className="flex flex-wrap gap-1.5">{trip.interests.map((i) => <Badge key={i}>{INTEREST_LABELS[i]}</Badge>)}</div>}
          <TripActions trip={trip} />
        </Card>
      </aside>
    </div>
  )
}
