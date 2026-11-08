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
import { CARD_SIZES, responsiveImage } from '@/lib/photos/responsive'

const PLANNING_STATES = new Set(['draft', 'planning', 'ready', 'upcoming'])

function greeting(now: Date) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function LiveBanner({ trip }: { trip: TripWithState }) {
  const day = currentDayNumber(trip, useNow())
  return (
    // Bright orange = happening now: the one place on Home that should grab the eye, with dark ink for contrast.
    <Link to={`/trips/${trip.id}/live`} className="lift flex items-center gap-4 rounded-xl bg-accent p-4 text-accent-fg shadow-accent sm:p-5">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-fg/10">
        <Radio className="size-6 motion-safe:animate-pulse" strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl font-extrabold leading-tight">You’re on {trip.title}{day ? ` — Day ${day}` : ''}</span>
        <span className="mt-0.5 block text-sm font-medium text-accent-fg/80">Today’s plan, your next stop and directions, one tap away</span>
      </span>
      <span aria-hidden className="hidden min-h-touch shrink-0 items-center gap-1 rounded-full bg-white px-5 font-bold text-accent-fg shadow-sm sm:inline-flex">
        Open Live Trip <ChevronRight className="size-4" />
      </span>
      <ChevronRight aria-hidden className="size-6 shrink-0 sm:hidden" />
    </Link>
  )
}

function MemoryThumb({ memory }: { memory: Memory }) {
  const url = useMediaUrl(memory.mediaKey)
  return (
    <Link to={`/trips/${memory.tripId}/memories`} className="group relative block aspect-square overflow-hidden rounded-lg bg-surface-2">
      {url && <img {...responsiveImage(url, CARD_SIZES)} alt={memory.caption ? '' : 'Trip photo'} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />}
      {memory.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 text-xs font-medium text-white">{memory.caption}</span>}
    </Link>
  )
}

interface PromptRow { id: string; label: string; to: string; trip: TripWithState }

/** A short list of next steps, each naming its trip. */
function PromptList({ rows }: { rows: PromptRow[] }) {
  return (
    <Card className="divide-y divide-border">
      {rows.map((t) => (
        <Link key={`${t.trip.id}-${t.id}`} to={t.to} className="flex min-h-touch items-center gap-3 px-4 py-3 hover:bg-surface-2">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t.label}</span>
            <span className="block truncate text-sm text-fg-muted">{t.trip.title}</span>
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-muted" />
        </Link>
      ))}
    </Card>
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
  const tasks: PromptRow[] = upcoming.flatMap((t) => (plans[t.id]?.progress.tasks ?? []).map((task) => ({ ...task, trip: t }))).slice(0, 6)
  // A finished trip has nothing left to plan: offer what comes next instead (spec §39 step 16).
  const finished = (trips.data ?? []).filter((t) => t.effectiveState === 'completed').sort((a, b) => b.endDate.localeCompare(a.endDate)).slice(0, 2)
  const afterTrip: PromptRow[] = finished.flatMap((t) => [
    { id: 'memories', label: 'Add memories', to: `/trips/${t.id}/memories/new`, trip: t },
    { id: 'share', label: 'Share this trip', to: `/trips/${t.id}/share`, trip: t },
  ])

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{greeting(now)}{session ? `, ${session.user.name}` : ''}</h1>
          <p className="mt-1 text-lg text-fg-muted">Where are we heading next?</p>
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
                title="Your next adventure starts here"
                description="Pick a place you’ve been dreaming about and we’ll sketch out the days together."
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

          <Section title="Explore" description="Places travellers can’t stop talking about" to="/explore">
            {destinations.isPending && <SkeletonGroup label="Loading destinations" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="aspect-[4/3]" /></SkeletonGroup>}
            {destinations.isError && <ErrorState onRetry={() => void destinations.refetch()} />}
            {destinations.data && <CardRow className="xl:grid-cols-3">{destinations.data.slice(0, 6).map((d, i) => <li key={d.id}><DestinationCard destination={d} priority={i === 0 && upcoming.length === 0} /></li>)}</CardRow>}
          </Section>

          <Section title="Inspiration" description="Real trips by real travellers. Borrow a plan and make it yours." to="/explore/itineraries">
            {publicTrips.isPending && <SkeletonGroup label="Loading itineraries" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-60" /><Skeleton className="h-60" /></SkeletonGroup>}
            {publicTrips.isError && <ErrorState title="Couldn’t load itineraries" onRetry={() => void publicTrips.refetch()} />}
            {publicTrips.data && publicTrips.data.length > 0 && <CardRow>{publicTrips.data.map((t) => <li key={t.id}><PublicTripCard trip={t} /></li>)}</CardRow>}
            {publicTrips.data?.length === 0 && (
              <EmptyState title="No shared itineraries yet" description="When travellers publish their trips they appear here. Publish one of yours to be the first." action={<Button asChild variant="secondary"><Link to="/trips">Your trips</Link></Button>} />
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-8 lg:col-span-4">
          {(trips.isPending || upcoming.length > 0) && (
            <Section title="Continue planning">
              {trips.isPending ? (
                <Skeleton className="h-40" />
              ) : tasks.length === 0 ? (
                <Card className="p-4 text-sm text-fg-muted">You’re all caught up. Time to start packing!</Card>
              ) : (
                <PromptList rows={tasks} />
              )}
            </Section>
          )}

          {afterTrip.length > 0 && (
            <Section title="After your trip" description="Relive the best bits and inspire the next traveller">
              <PromptList rows={afterTrip} />
            </Section>
          )}

          <Section title="Memories">
            {memories.isPending ? (
              <Skeleton className="h-32" />
            ) : memories.data && memories.data.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2">{memories.data.map((m) => <li key={m.id}><MemoryThumb memory={m} /></li>)}</ul>
            ) : (
              <Card className="flex items-center gap-3 p-4 text-sm text-fg-muted"><ImageIcon aria-hidden className="size-5 shrink-0" /> Snap a photo on your trip and it lands right here.</Card>
            )}
          </Section>
        </aside>
      </div>
    </div>
  )
}
