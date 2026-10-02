import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Camera, Clapperboard, Globe, Lock, Users } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useMediaUrl } from '@/data/queries/media'
import { useMemories, useMemoryActions, useStories } from '@/data/queries/memories'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { useOnline } from '@/lib/hooks/useOnline'
import type { Memory, Story } from '@/types'
import { MemoryCard } from './components/MemoryCard'

const visibilityMeta = { private: { label: 'Private', icon: Lock }, friends: { label: 'Friends', icon: Users }, public: { label: 'Public', icon: Globe } } as const

function StoryTile({ story, tripId, cover }: { story: Story; tripId: string; cover?: Memory }) {
  const url = useMediaUrl(cover?.mediaKey)
  const v = visibilityMeta[story.visibility]
  return (
    <Link to={`/trips/${tripId}/stories/${story.id}`} className="relative block aspect-[9/16] w-32 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-36">
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 text-white">
        <span className="block text-sm font-semibold">{story.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs opacity-90"><v.icon aria-hidden className="size-3" />{v.label} · {story.slides.length} slides</span>
      </span>
    </Link>
  )
}

/** `/trips/:id/memories` — the trip as a day-by-day journal (spec §23), plus its stories. */
export function MemoriesTimeline() {
  const trip = useOutletContext<TripWithState>()
  const memories = useMemories(trip.id)
  const stories = useStories(trip.id)
  const plan = useTripPlan(trip.id)
  const actions = useMemoryActions(trip.id)
  const online = useOnline()
  const base = `/trips/${trip.id}`

  const groups = useMemo(() => {
    const days = plan.data?.days ?? []
    const list = memories.data ?? []
    const out = days.map((d) => ({ key: d.id, title: `Day ${d.dayNumber}${d.title ? ` — ${d.title}` : ''}`, memories: list.filter((m) => m.dayId === d.id) }))
    const loose = list.filter((m) => !m.dayId || !days.some((d) => d.id === m.dayId))
    if (loose.length) out.push({ key: 'other', title: 'Other moments', memories: loose })
    return out.filter((g) => g.memories.length > 0)
  }, [plan.data?.days, memories.data])

  if (memories.isPending || plan.isPending) {
    return (
      <SkeletonGroup label="Loading memories" className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3]" />)}</div>
      </SkeletonGroup>
    )
  }
  if (memories.isError || plan.isError) return <ErrorState title="Couldn’t load memories" onRetry={() => { void memories.refetch(); void plan.refetch() }} />

  const all = memories.data
  const items = new Map(plan.data.items.map((i) => [i.id, i.title]))
  const waiting = all.filter((m) => m.uploadState === 'queued' || m.uploadState === 'uploading').length
  const canAdd = trip.effectiveState !== 'archived'

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-fg-muted">{all.length === 0 ? 'Nothing captured yet.' : `${all.length} ${all.length === 1 ? 'memory' : 'memories'}`}</p>
        <div className="flex flex-wrap gap-2">
          {canAdd && <Button asChild><Link to={`${base}/memories/new`}><Camera aria-hidden className="size-4" /> Add memory</Link></Button>}
          {all.length > 0 && <Button asChild variant="secondary"><Link to={`${base}/stories/new`}><Clapperboard aria-hidden className="size-4" /> Create story</Link></Button>}
        </div>
      </div>

      {waiting > 0 && (
        <div role="status" className="rounded-md border border-border bg-surface-2 px-4 py-3 text-sm">
          {waiting} {waiting === 1 ? 'memory is' : 'memories are'} saved on this device and waiting to upload{online ? '…' : ' — they’ll send when you’re back online.'}
        </div>
      )}

      {stories.data && stories.data.length > 0 && (
        <section aria-labelledby="stories-h">
          <h2 id="stories-h" className="mb-3 text-xl font-semibold">Stories</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {stories.data.map((s) => <StoryTile key={s.id} story={s} tripId={trip.id} cover={all.find((m) => m.id === s.slides.find((x) => x.memoryId)?.memoryId)} />)}
          </div>
        </section>
      )}

      {all.length === 0 ? (
        <EmptyState
          title="No memories yet"
          description={trip.effectiveState === 'active' ? 'Snap a photo, jot a note or record a voice note — it’s filed under today’s activity automatically.' : 'Photos, notes and voice notes from your trip will be collected here, day by day.'}
          action={canAdd ? <Button asChild><Link to={`${base}/memories/new`}>Add your first memory</Link></Button> : undefined}
        />
      ) : (
        groups.map((g) => (
          <section key={g.key} aria-labelledby={`h-${g.key}`}>
            <h2 id={`h-${g.key}`} className="mb-3 text-xl font-semibold">{g.title}</h2>
            <div className="sm:columns-2 sm:gap-4 xl:columns-3">
              {g.memories.map((m) => (
                <MemoryCard key={m.id} memory={m} timeZone={trip.timezone} activity={m.itemId ? items.get(m.itemId) : undefined} canEdit={canAdd} onDelete={(x) => void actions.remove(x)} onRetry={() => void actions.retry()} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
