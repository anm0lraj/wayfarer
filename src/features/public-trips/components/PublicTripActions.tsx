import { Bookmark, Copy, Heart, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLikedPublicIds, useSavedPublicIds, useSignInGate, useToggleLikePublic, useToggleSavePublic } from '@/data/queries/publicTrips'
import { announce } from '@/lib/a11y/announce'
import { shareLink } from '@/lib/share'
import type { PublicTrip } from '@/types'

interface Props {
  trip: PublicTrip
  onUse: () => void
}

/** Like, Save, Share and Use This Itinerary. Anyone can read a public trip; the first three need an account. */
export function PublicTripActions({ trip, onUse }: Props) {
  const gate = useSignInGate()
  const saved = useSavedPublicIds().data?.has(trip.id) ?? false
  const liked = useLikedPublicIds().data?.has(trip.id) ?? false
  const toggleSave = useToggleSavePublic()
  const toggleLike = useToggleLikePublic()

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={() => gate(onUse)}><Copy aria-hidden className="size-5" /> Use This Itinerary</Button>
      <Button
        size="lg" variant="secondary" aria-pressed={saved}
        onClick={() => gate(() => { toggleSave.mutate({ id: trip.id, saved }); announce(saved ? 'Removed from saved' : 'Saved') })}
      >
        <Bookmark aria-hidden className={`size-5 ${saved ? 'fill-current' : ''}`} /> {saved ? 'Saved' : 'Save'}
      </Button>
      <Button
        size="lg" variant="secondary" aria-pressed={liked} aria-label={`${liked ? 'Unlike' : 'Like'} — ${trip.likeCount.toLocaleString('en-IN')} likes`}
        onClick={() => gate(() => { toggleLike.mutate(trip.id); announce(liked ? 'Like removed' : 'Liked') })}
      >
        <Heart aria-hidden className={`size-5 ${liked ? 'fill-current text-error' : ''}`} /> {trip.likeCount.toLocaleString('en-IN')}
      </Button>
      <Button size="lg" variant="secondary" onClick={() => void shareLink({ title: trip.title, text: trip.description, url: `${window.location.origin}/t/${trip.slug}` })}>
        <Share2 aria-hidden className="size-5" /> Share
      </Button>
    </div>
  )
}
