import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useSavedTrips } from '@/data/queries/publicTrips'
import { PublicFeedCard } from './components/PublicFeedCard'

/** `/saved` — itineraries you’ve bookmarked from the Explore feed or a public trip page. */
export function SavedTrips() {
  const saved = useSavedTrips()
  return (
    <>
      <PageHeader title="Saved trips" description="Itineraries you’ve bookmarked. Copy one when you’re ready to plan it." />
      {saved.isPending && (
        <SkeletonGroup label="Loading saved trips" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3]" />)}
        </SkeletonGroup>
      )}
      {saved.isError && <ErrorState title="Couldn’t load your saved trips" onRetry={() => void saved.refetch()} />}
      {saved.data && saved.data.length === 0 && (
        <EmptyState
          title="Nothing saved yet"
          description="Tap the bookmark on any itinerary to keep it here."
          action={<Button asChild><Link to="/explore/itineraries">Browse itineraries</Link></Button>}
        />
      )}
      {saved.data && saved.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.data.map((t) => <li key={t.id}><PublicFeedCard trip={t} /></li>)}
        </ul>
      )}
    </>
  )
}
