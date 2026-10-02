import { useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Pencil, Play, Trash2 } from 'lucide-react'
import { ErrorState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDeleteStory, useMemories, useStory } from '@/data/queries/memories'
import { useTripPlan } from '@/data/queries/plan'
import type { TripWithState } from '@/data/queries/trips'
import { StoryViewer } from './components/StoryViewer'

const visibilityLabel = { private: 'Private', friends: 'Friends only', public: 'Public' } as const

/** `/trips/:id/stories/:storyId` — plays the story immediately; the page behind it offers edit and delete. */
export function StoryView() {
  const trip = useOutletContext<TripWithState>()
  const { storyId } = useParams()
  const navigate = useNavigate()
  const story = useStory(storyId)
  const memories = useMemories(trip.id)
  const plan = useTripPlan(trip.id)
  const del = useDeleteStory(trip.id)
  const [playing, setPlaying] = useState(true)
  const base = `/trips/${trip.id}`

  if (story.isPending || memories.isPending) return <Skeleton className="h-96 w-full" />
  if (story.isError) return <ErrorState title="Couldn’t load this story" onRetry={() => void story.refetch()} />
  if (!story.data) return <ErrorState title="Story not found" description="It may have been deleted." action={<Link className="font-semibold text-primary underline" to={`${base}/memories`}>Back to memories</Link>} />
  const s = story.data
  const canEdit = trip.effectiveState !== 'archived'

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{s.title}</h2>
        <Badge>{visibilityLabel[s.visibility]}</Badge>
      </div>
      <p className="text-fg-muted">{s.slides.length} {s.slides.length === 1 ? 'slide' : 'slides'}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setPlaying(true)}><Play aria-hidden className="size-4" /> Watch</Button>
        {canEdit && <Button asChild variant="secondary"><Link to={`${base}/stories/${s.id}/edit`}><Pencil aria-hidden className="size-4" /> Edit</Link></Button>}
        {canEdit && <Button variant="ghost" onClick={async () => { await del.mutateAsync(s.id); navigate(`${base}/memories`) }}><Trash2 aria-hidden className="size-4" /> Delete</Button>}
        <Button asChild variant="ghost"><Link to={`${base}/memories`}>Back to memories</Link></Button>
      </div>
      {playing && <StoryViewer story={s} memories={memories.data ?? []} items={plan.data?.items ?? []} onClose={() => setPlaying(false)} />}
    </div>
  )
}
