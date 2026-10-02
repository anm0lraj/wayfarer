import { Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PublicTripCard } from '@/components/domain/PublicTripCard'
import { useSavedPublicIds, useSignInGate, useToggleSavePublic } from '@/data/queries/publicTrips'
import { announce } from '@/lib/a11y/announce'
import { cn } from '@/lib/cn'
import type { PublicTrip } from '@/types'

/** A feed post: the trip card plus Save and Use itinerary. Viewing is the card link itself. */
export function PublicFeedCard({ trip, className }: { trip: PublicTrip; className?: string }) {
  const gate = useSignInGate()
  const saved = useSavedPublicIds().data?.has(trip.id) ?? false
  const toggle = useToggleSavePublic()
  return (
    <div className={cn('relative', className)}>
      <PublicTripCard trip={trip} />
      <button
        type="button"
        aria-pressed={saved}
        aria-label={`${saved ? 'Unsave' : 'Save'} ${trip.title}`}
        onClick={() => gate(() => { toggle.mutate({ id: trip.id, saved }); announce(saved ? 'Removed from saved' : 'Saved') })}
        className="absolute right-3 top-3 grid min-h-touch min-w-touch place-items-center rounded-full bg-surface/95 text-fg shadow-sm backdrop-blur hover:bg-surface"
      >
        <Bookmark aria-hidden className={cn('size-5', saved && 'fill-current text-primary')} />
      </button>
      <Link to={`/t/${trip.slug}?use=1`} className="mt-1 inline-flex min-h-touch items-center px-1 text-sm font-semibold text-primary hover:underline">
        Use this itinerary
      </Link>
    </div>
  )
}
