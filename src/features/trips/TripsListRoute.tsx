import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { TripCard } from '@/components/domain/TripCard'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { useTripPlans } from '@/data/queries/plan'
import { useTrips, type TripWithState } from '@/data/queries/trips'
import { countdownLabel, dateInTimezone } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'

const TABS = [
  { id: 'upcoming', label: 'Upcoming', match: (t: TripWithState) => !['completed', 'archived'].includes(t.effectiveState), empty: ['No upcoming trips', 'Start planning and your next trip will show up here.'] },
  { id: 'past', label: 'Past', match: (t: TripWithState) => t.effectiveState === 'completed', empty: ['No past trips yet', 'Completed trips and their memories live here.'] },
  { id: 'archived', label: 'Archived', match: (t: TripWithState) => t.effectiveState === 'archived', empty: ['Nothing archived', 'Archive a trip from its overview to tidy up without deleting it.'] },
] as const

export function TripsList() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'upcoming'
  const now = useNow()
  const trips = useTrips()
  const plans = useTripPlans(trips.data?.map((t) => t.id) ?? [])

  return (
    <>
      <PageHeader title="Trips" actions={<Button asChild><Link to="/trips/new/destination"><Plus aria-hidden className="size-5" /> Plan a Trip</Link></Button>} />
      {trips.isPending && <SkeletonGroup label="Loading trips" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /></SkeletonGroup>}
      {trips.isError && <ErrorState title="Couldn’t load your trips" onRetry={() => void trips.refetch()} />}
      {trips.data && (
        <Tabs value={tab} onValueChange={(v) => setParams(v === 'upcoming' ? {} : { tab: v }, { replace: true })}>
          <TabsList aria-label="Trip filters">
            {TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label} ({trips.data.filter(t.match).length})</TabsTrigger>)}
          </TabsList>
          {TABS.map((t) => {
            const list = trips.data.filter(t.match)
            if (t.id === 'past') list.sort((a, b) => b.startDate.localeCompare(a.startDate))
            return (
              <TabsContent key={t.id} value={t.id} className="pt-5">
                {list.length === 0 ? (
                  <EmptyState title={t.empty[0]} description={t.empty[1]} action={t.id === 'upcoming' ? <Button asChild><Link to="/trips/new/destination">Plan a Trip</Link></Button> : undefined} />
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map((trip) => (
                      <li key={trip.id}>
                        <TripCard
                          trip={trip}
                          state={trip.effectiveState}
                          progress={plans[trip.id]?.progress.percent}
                          countdown={trip.effectiveState === 'active' ? 'Happening now' : countdownLabel(trip.startDate, dateInTimezone(now, trip.timezone))}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </>
  )
}
