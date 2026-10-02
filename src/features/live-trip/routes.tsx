import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useTripPlan } from '@/data/queries/plan'
import { useTrip, type TripWithState } from '@/data/queries/trips'
import { format, parseISO } from 'date-fns'
import { dateInTimezone, daysBetween } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'
import { PermissionError } from '@/lib/permissions'
import { LiveDashboard } from './LiveDashboard'

function NotLive({ trip }: { trip: TripWithState }) {
  const now = useNow()
  const away = daysBetween(dateInTimezone(now, trip.timezone), trip.startDate)
  const finished = trip.effectiveState === 'completed'
  return (
    <EmptyState as="h1"
      title={finished ? `${trip.title} is over` : away > 0 ? `Live Trip starts on ${format(parseISO(trip.startDate), 'd MMM')}` : 'This trip isn’t live'}
      description={
        finished
          ? 'Live Trip is only for while you’re travelling. Your plan and memories are still in the trip.'
          : 'On the day you depart, this becomes a simple, glanceable guide for the day. Until then, keep planning.'
      }
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild><Link to={`/trips/${trip.id}`}>Open trip</Link></Button>
          <Button asChild variant="secondary"><Link to="/settings">Try the demo date simulator</Link></Button>
        </div>
      }
    />
  )
}

/** `/trips/:tripId/live` — today's plan while travelling (spec §19–20). */
export default function LiveTrip() {
  const { tripId } = useParams()
  const trip = useTrip(tripId)
  const plan = useTripPlan(tripId)

  if (trip.isPending || (trip.data?.effectiveState === 'active' && plan.isPending)) {
    return (
      <SkeletonGroup label="Loading your day" className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </SkeletonGroup>
    )
  }
  if (trip.isError || plan.isError) {
    const denied = trip.error instanceof PermissionError
    return <ErrorState as="h1" title={denied ? 'You don’t have access to this trip' : 'Couldn’t load your day'} onRetry={denied ? undefined : () => { void trip.refetch(); void plan.refetch() }} />
  }
  if (!trip.data) return <ErrorState as="h1" title="Trip not found" description="It may have been deleted." />
  if (trip.data.effectiveState !== 'active' || !plan.data) return <NotLive trip={trip.data} />
  return <LiveDashboard trip={trip.data} plan={plan.data} />
}
