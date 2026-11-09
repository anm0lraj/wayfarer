import { Link, Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { PublicTripCard } from '@/components/domain/PublicTripCard'
import { TripCard } from '@/components/domain/TripCard'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabLink, TabNav } from '@/components/ui/Tabs'
import { useSession } from '@/app/providers/session'
import { useDestinations } from '@/data/queries/catalog'
import { useRecentMemories } from '@/data/queries/community'
import { useMediaUrl } from '@/data/queries/media'
import { useSavedTrips } from '@/data/queries/publicTrips'
import { useTrips } from '@/data/queries/trips'
import { db } from '@/data/db'
import type { Memory } from '@/types'
import { CARD_SIZES, responsiveImage } from '@/lib/photos/responsive'

const TABS = ['trips', 'published', 'saved', 'memories'] as const
type Tab = (typeof TABS)[number]

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-4 py-3 text-center">
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      <dt className="text-sm text-fg-muted">{label}</dt>
    </div>
  )
}

function MemoryTile({ memory }: { memory: Memory }) {
  const url = useMediaUrl(memory.mediaKey)
  return (
    <Link to={`/trips/${memory.tripId}/memories`} className="relative block aspect-square overflow-hidden rounded-lg bg-surface-2">
      {url && <img {...responsiveImage(url, CARD_SIZES)} alt={memory.caption ?? 'Trip photo'} loading="lazy" className="size-full object-cover" />}
    </Link>
  )
}

const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

function TabBody({ tab }: { tab: Tab }) {
  const session = useSession()
  const trips = useTrips()
  const published = useQuery({
    queryKey: ['public-trips', 'mine', session?.user.id],
    queryFn: () => db.publicTrips.where('ownerId').equals(session!.user.id).toArray(),
  })
  const saved = useSavedTrips()
  const memories = useRecentMemories(60)

  if (tab === 'trips') {
    if (trips.isPending) return <Skeleton className="h-64 w-full" />
    if (trips.isError) return <ErrorState title="Couldn’t load your trips" onRetry={() => void trips.refetch()} />
    if (!trips.data.length) return <EmptyState title="Where will you go first?" description="Plan your first trip in a couple of minutes. We’ll help with the days." action={<Button asChild><Link to="/trips/new">Plan a trip</Link></Button>} />
    return <ul className={grid}>{trips.data.map((t) => <li key={t.id}><TripCard trip={t} state={t.effectiveState} /></li>)}</ul>
  }
  if (tab === 'published') {
    if (published.isPending) return <Skeleton className="h-64 w-full" />
    if (published.isError) return <ErrorState title="Couldn’t load your published trips" onRetry={() => void published.refetch()} />
    if (!published.data.length) return <EmptyState art="globe" title="Share a trip, inspire a traveller" description="Publish a finished trip and others can follow in your footsteps." action={<Button asChild variant="secondary"><Link to="/trips">Choose a trip</Link></Button>} />
    return <ul className={grid}>{published.data.map((t) => <li key={t.id}><PublicTripCard trip={t} /></li>)}</ul>
  }
  if (tab === 'saved') {
    if (saved.isPending) return <Skeleton className="h-64 w-full" />
    if (saved.isError) return <ErrorState title="Couldn’t load saved trips" onRetry={() => void saved.refetch()} />
    if (!saved.data.length) return <EmptyState art="pin" title="Your wishlist is waiting" description="Tap the bookmark on any itinerary you love to keep it here." action={<Button asChild><Link to="/explore/itineraries">Browse itineraries</Link></Button>} />
    return <ul className={grid}>{saved.data.map((t) => <li key={t.id}><PublicTripCard trip={t} /></li>)}</ul>
  }
  if (memories.isPending) return <Skeleton className="h-64 w-full" />
  if (memories.isError) return <ErrorState title="Couldn’t load memories" onRetry={() => void memories.refetch()} />
  if (!memories.data.length) return <EmptyState art="camera" title="Your story starts with one photo" description="Photos and notes you add during a trip appear here." />
  return <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{memories.data.map((m) => <li key={m.id}><MemoryTile memory={m} /></li>)}</ul>
}

/** `/profile/:tab` — who you are, your travel stats, and your trips, published itineraries, saved and memories. */
export default function Profile() {
  const { tab } = useParams()
  const session = useSession()
  const trips = useTrips()
  const destinations = useDestinations()
  const memories = useRecentMemories(500)
  // `/profile` opens My trips at its own URL, so that tab reads as the current one.
  if (!TABS.includes(tab as Tab)) return <Navigate to="/profile/trips" replace />

  const user = session?.user
  const dest = new Map((destinations.data ?? []).map((d) => [d.id, d]))
  const visited = new Set((trips.data ?? []).flatMap((t) => t.destinationIds))
  const countries = new Set([...visited].map((id) => dest.get(id)?.country).filter(Boolean))

  return (
    <>
      <PageHeader title="Profile" actions={<Button asChild variant="secondary"><Link to="/settings"><Settings aria-hidden className="size-5" /> Settings</Link></Button>} />
      <section aria-label="About you" className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div aria-hidden className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-3xl font-bold text-primary">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : (user?.name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{user?.name}</h2>
          {user?.homeLocation && <p className="text-fg-muted">{user.homeLocation}</p>}
          {user?.bio && <p className="mt-1 max-w-xl">{user.bio}</p>}
        </div>
        <dl className="grid grid-cols-4 gap-2 sm:w-96" aria-label="Travel stats">
          <Stat label="Trips" value={trips.data?.length ?? '–'} />
          <Stat label="Countries" value={countries.size} />
          <Stat label="Cities" value={visited.size} />
          <Stat label="Memories" value={memories.data?.length ?? '–'} />
        </dl>
      </section>
      <TabNav label="Profile sections" className="mb-5">
        <TabLink to="/profile/trips">My trips</TabLink>
        <TabLink to="/profile/published">Published</TabLink>
        <TabLink to="/profile/saved">Saved</TabLink>
        <TabLink to="/profile/memories">Memories</TabLink>
      </TabNav>
      <TabBody tab={tab as Tab} />
    </>
  )
}
