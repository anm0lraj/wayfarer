import { Bookmark, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMoney } from '@/lib/money'
import type { PublicTrip } from '@/types'

/** Another traveller's published itinerary: cover, title, creator, length, budget and saves. */
export function PublicTripCard({ trip, priority }: { trip: PublicTrip; priority?: boolean }) {
  const [low, high] = trip.budgetRange
  return (
    <Link to={`/t/${trip.slug}`} className="group block overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-[16/10] overflow-hidden bg-surface-2">
        <img src={trip.coverImage} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
      </div>
      <div className="space-y-1.5 p-3.5">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug">{trip.title}</h3>
        <p className="text-sm text-fg-muted">by {trip.ownerName}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden className="size-4" />{trip.durationDays} days</span>
          {high.amount > 0 && <span>{formatMoney(low)}–{formatMoney(high)}</span>}
          <span className="inline-flex items-center gap-1"><Bookmark aria-hidden className="size-4" />{trip.saveCount.toLocaleString('en-IN')}<span className="sr-only"> saves</span></span>
        </p>
      </div>
    </Link>
  )
}
