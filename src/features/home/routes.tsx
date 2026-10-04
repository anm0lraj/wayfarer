import { Link } from 'react-router-dom'
import { ChevronRight, Image as ImageIcon, Plus, Radio } from 'lucide-react'
import { useSession } from '@/app/providers/session'
import { InvitationsCard } from '@/features/sharing/InvitationsCard'
import { DestinationCard } from '@/components/domain/DestinationCard'
import { PublicTripCard } from '@/components/domain/PublicTripCard'
import { TripCard } from '@/components/domain/TripCard'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { CardRow, Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useDestinations } from '@/data/queries/catalog'
import { usePublicTrips, useRecentMemories } from '@/data/queries/community'
import { useMediaUrl } from '@/data/queries/media'
import { useTripPlans } from '@/data/queries/plan'
import { useTrips, type TripWithState } from '@/data/queries/trips'
import { currentDayNumber } from '@/features/trips/tripState'
import { countdownLabel, dateInTimezone } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'
import type { Memory } from '@/types'

const PLANNING_STATES = new Set(['draft', 'planning', 'ready', 'upcoming'])

function greeting(now: Date) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function LiveBanner({ trip }: { trip: TripWithState }) {
  const day = currentDayNumber(trip, useNow())
  return (
    <Link to={`/trips/${trip.id}/live`} className="flex items-center gap-3 rounded-lg bg-secondary p-4 text-secondary-fg shadow-md">
      <Radio aria-hidden className="size-6 shrink-0 motion-safe:animate-pulse" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">You’re on {trip.title}{day ? ` — Day ${day}` : ''}</span>
        <span className="block text-sm opacity-90">Open Live Trip for today’s plan and directions</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0" />
    </Link>
  )
}

function MemoryThumb({ memory }: { memory: Memory }) {
  const url = useMediaUrl(memory.mediaKey)
  return (
    <Link to={`/trips/${memory.tripId}/memories`} className="group relative block aspect-square overflow-hidden rounded-lg bg-surface-2">
      {url && <img src={url} alt={memory.caption ? '' : 'Trip photo'} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />}
      {memory.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs font-medium text-white">{memory.caption}</span>}
    </Link>
  )
}

export default function HomeRoute() {
  const now = useNow()
  const session = useSession()
  const trips = useTrips()
  const plans = useTripPlans(trips.data?.map((t) => t.id) ?? [])
  const destinations = useDestinations()
  const publicTrips = usePublicTrips(6)
  const memories = useRecentMemories(6)

  const active = trips.data?.find((t) => t.effectiveState === 'active')
  const upcoming = (trips.data ?? []).filter((t) => PLANNING_STATES.has(t.effectiveState))
  const tasks = upcoming.flatMap((t) => (plans[t.id]?.progress.tasks ?? []).map((task) => ({ ...task, trip: t }))).slice(0, 6)

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{greeting(now)}{session ? `, ${session.user.name}` : ''}</h1>
          <p className="mt-1 text-fg-muted">Where to next?</p>
        </div>
        <Button asChild><Link to="/trips/new/destination"><Plus aria-hidden className="size-5" /> Plan a Trip</Link></Button>
      </header>

      {active && <LiveBanner trip={active} />}

      <InvitationsCard />

      <div className="space-y-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0">
        <div className="min-w-0 space-y-8 lg:col-span-8">
          <Section title="Upcoming trips" to="/trips" linkLabel="All trips">
            {trips.isPending && (
              <SkeletonGroup label="Loading trips" className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="hidden h-64 sm:block" /></SkeletonGroup>
            )}
            {trips.isError && <ErrorState title="Couldn’t load your trips" onRetry={() => void trips.refetch()} />}
            {trips.data && upcoming.length === 0 && (
              <EmptyState
                title="No trips on the horizon"
                description="Pick a destination and we’ll build a day-by-day plan with you."
                action={<Button asChild><Link to="/trips/new/destination">Plan a Trip</Link></Button>}
              />
            )}
            {upcoming.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((t, i) => (
                  <li key={t.id}>
                    <TripCard priority={i === 0} trip={t} state={t.effectiveState} progress={plans[t.id]?.progress.percent} countdown={countdownLabel(t.startDate, dateInTimezone(now, t.timezone))} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Explore" description="Destinations travellers love right now" to="/explore">
            {destinations.isPending && <SkeletonGroup label="Loading destinations" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="aspect-[4/3]" /></SkeletonGroup>}
            {destinations.isError && <ErrorState onRetry={() => void destinations.refetch()} />}
            {destinations.data && <CardRow>{destinations.data.slice(0, 6).map((d, i) => <li key={d.id}><DestinationCard destination={d} priority={i === 0 && upcoming.length === 0} /></li>)}</CardRow>}
          </Section>

          <Section title="Inspiration" description="Itineraries from other travellers" to="/explore/itineraries">
            {publicTrips.isPending && <SkeletonGroup label="Loading itineraries" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-60" /><Skeleton className="h-60" /></SkeletonGroup>}
            {publicTrips.isError && <ErrorState title="Couldn’t load itineraries" onRetry={() => void publicTrips.refetch()} />}
            {publicTrips.data && publicTrips.data.length > 0 && <CardRow>{publicTrips.data.map((t) => <li key={t.id}><PublicTripCard trip={t} /></li>)}</CardRow>}
            {publicTrips.data?.length === 0 && (
              <EmptyState title="No shared itineraries yet" description="When travellers publish their trips they appear here. Publish one of yours to be the first." action={<Button asChild variant="secondary"><Link to="/trips">Your trips</Link></Button>} />
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-8 lg:col-span-4">
          <Section title="Continue planning">
            {trips.isPending ? (
              <Skeleton className="h-40" />
            ) : tasks.length === 0 ? (
              <Card className="p-4 text-sm text-fg-muted">You’re all caught up. Nice work.</Card>
            ) : (
              <Card className="divide-y divide-border">
                {tasks.map((t) => (
                  <Link key={`${t.trip.id}-${t.id}`} to={t.to} className="flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{t.label}</span>
                      <span className="block truncate text-sm text-fg-muted">{t.trip.title}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-muted" />
                  </Link>
                ))}
              </Card>
            )}
          </Section>

          <Section title="Memories">
            {memories.isPending ? (
              <Skeleton className="h-32" />
            ) : memories.data && memories.data.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2">{memories.data.map((m) => <li key={m.id}><MemoryThumb memory={m} /></li>)}</ul>
            ) : (
              <Card className="flex items-center gap-3 p-4 text-sm text-fg-muted"><ImageIcon aria-hidden className="size-5 shrink-0" /> Photos you add during a trip will show up here.</Card>
            )}
          </Section>
        </aside>
      </div>
    </div>
  )
}
