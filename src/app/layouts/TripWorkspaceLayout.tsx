import { lazy, Suspense } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

import { useAIPanel } from '@/features/ai/panelStore'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { ErrorState } from '@/components/feedback/States'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Chip'
import { TabLink, TabNav } from '@/components/ui/Tabs'
import { WeatherChip } from '@/components/domain/WeatherChip'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useDestination } from '@/data/queries/catalog'
import { useTripPlan } from '@/data/queries/plan'
import { useTrip, type TripWithState } from '@/data/queries/trips'
import { useForecast } from '@/data/queries/weather'
import { stateLabel } from '@/features/trips/tripState'
import { PlacePhotoRunner } from '@/features/place-photos/PlacePhotoRunner'
import { dateInTimezone, formatDateRange } from '@/lib/dates'
import { clock } from '@/services/clock/clock'
import { PermissionError } from '@/lib/permissions'
import { placeName } from '@/lib/places'
import type { TripState } from '@/types'

// The assistant panel is only needed once opened on desktop, so it stays out of the main bundle.
const AIPanel = lazy(() => import('@/features/ai/AIPanel').then((m) => ({ default: m.AIPanel })))

const stateTone: Record<TripState, 'neutral' | 'primary' | 'success' | 'warning' | 'accent'> = {
  draft: 'neutral', planning: 'primary', ready: 'success', upcoming: 'success', active: 'accent', completed: 'neutral', archived: 'neutral',
}

/** Destination, dates, weather and planning progress (spec §10 header). Own component so its hooks stay out of the loading branches. */
function TripHeaderMeta({ trip }: { trip: TripWithState }) {
  const destination = useDestination(trip.destinationIds[0])
  const today = dateInTimezone(clock.now(), trip.timezone)
  // During the trip show today's weather; before it, the first day's.
  const day = trip.effectiveState === 'active' ? today : trip.startDate
  const forecast = useForecast(destination.data?.location, day, day)
  const plan = useTripPlan(trip.id)
  const w = forecast.data?.[0]
  const planning = ['draft', 'planning', 'ready', 'upcoming'].includes(trip.effectiveState)
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-fg-muted">
      <span>{destination.data ? `${placeName(destination.data)} · ` : ''}{formatDateRange(trip.startDate, trip.endDate)} · {trip.travellers.count} travellers</span>
      {w && <WeatherChip condition={w.condition} tempC={w.highC} />}
      {planning && plan.data && (
        <span className="flex items-center gap-2">
          <ProgressBar value={plan.data.progress.percent} label={`Planning ${plan.data.progress.percent}% complete`} className="w-24" />
          <span className="text-sm">{plan.data.progress.percent}% planned</span>
        </span>
      )}
    </div>
  )
}

/** Phone header for every tab but Overview: back, title with dates and state, assistant — one row. */
function CompactTripHeader({ trip, base }: { trip: TripWithState; base: string }) {
  return (
    <header className="-mt-2 flex items-center gap-1 pb-2">
      <Link to="/trips" aria-label="All trips" className="-ml-3 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg">
        <ChevronLeft aria-hidden className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-snug">{trip.title}</h1>
        <p className="truncate text-sm text-fg-muted">{formatDateRange(trip.startDate, trip.endDate)} · {stateLabel[trip.effectiveState]}</p>
      </div>
      <Button asChild variant="secondary" size="icon" className="shrink-0">
        <Link to={`${base}/ai`} aria-label="Assistant"><Sparkles aria-hidden className="size-5" /></Link>
      </Button>
    </header>
  )
}

/** `/trips/:tripId/*` — header (destination, dates, weather, progress, state) plus URL-reflected tabs. */
export function TripWorkspaceLayout() {
  const { tripId } = useParams()
  const { data: trip, isPending, isError, error, refetch } = useTrip(tripId)

  if (isPending) {
    return (
      <SkeletonGroup label="Loading trip" className="space-y-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-64 w-full" />
      </SkeletonGroup>
    )
  }
  if (isError) {
    const denied = error instanceof PermissionError
    return <ErrorState as="h1" title={denied ? 'You don’t have access to this trip' : 'Couldn’t load this trip'} description={denied ? 'Ask the owner to invite you.' : undefined} onRetry={denied ? undefined : () => void refetch()} />
  }
  if (!trip) {
    return <ErrorState as="h1" title="Trip not found" description="It may have been deleted." action={<Link className="font-semibold text-primary underline" to="/trips">Back to your trips</Link>} />
  }

  return <Workspace trip={trip} />
}

/** Header, tabs and the routed content; on desktop the assistant can dock to the right of all of it. */
function Workspace({ trip }: { trip: TripWithState }) {
  const base = `/trips/${trip.id}`
  const desktop = useMediaQuery('(min-width: 1024px)')
  const { open, setOpen } = useAIPanel()
  const docked = desktop && open
  // Phones keep the full header for Overview only; on the working tabs it shrinks to one row so the content starts
  // near the top of the screen (destination, weather and progress are a tap away on Overview).
  const phone = !useMediaQuery('(min-width: 640px)')
  const onOverview = useMatch({ path: '/trips/:tripId', end: true }) !== null
  const compact = phone && !onOverview
  // Stories are made from memories and live under them in the tabs, though their URLs are /stories/….
  const inStories = useMatch('/trips/:tripId/stories/*') !== null
  return (
    <div className={docked ? 'flex items-start gap-3' : undefined}>
      <div className="min-w-0 flex-1">
        {compact ? <CompactTripHeader trip={trip} base={base} /> : (
          <header className="pb-3">
            <Link to="/trips" className="inline-flex min-h-touch items-center gap-1 text-sm text-fg-muted hover:text-fg">
              <ChevronLeft aria-hidden className="size-4" /> Trips
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold sm:text-4xl">{trip.title}</h1>
                <Badge tone={stateTone[trip.effectiveState]}>{stateLabel[trip.effectiveState]}</Badge>
              </div>
              {desktop ? (
                <Button variant={open ? 'primary' : 'secondary'} size="sm" aria-pressed={open} onClick={() => setOpen(!open)}><Sparkles aria-hidden className="size-4" /> Assistant</Button>
              ) : (
                <Button asChild variant="secondary" size="sm"><Link to={`${base}/ai`}><Sparkles aria-hidden className="size-4" /> Assistant</Link></Button>
              )}
            </div>
            <TripHeaderMeta trip={trip} />
          </header>
        )}
        <TabNav label="Trip sections" className="mb-5">
          <TabLink to={base} end>Overview</TabLink>
          <TabLink to={`${base}/itinerary`}>Itinerary</TabLink>
          <TabLink to={`${base}/map`}>Map</TabLink>
          <TabLink to={`${base}/bookings`}>Bookings</TabLink>
          <TabLink to={`${base}/memories`} current={inStories}>Memories</TabLink>
        </TabNav>
        <Outlet context={trip} />
        <PlacePhotoRunner tripId={trip.id} />
      </div>
      {docked && <Suspense fallback={<div className="hidden w-[400px] lg:block" aria-hidden />}><AIPanel trip={trip} /></Suspense>}
    </div>
  )
}
