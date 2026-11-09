import { Bookmark, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Chip'
import { fetchPriority } from '@/lib/fetchPriority'
import { formatMoney } from '@/lib/money'
import type { PublicTrip } from '@/types'
import { FEED_SIZES, responsiveImage } from '@/lib/photos/responsive'

/** Another traveller's published itinerary: cover, title, creator, length, budget and saves. */
export function PublicTripCard({ trip, priority, headingLevel = 3 }: { trip: PublicTrip; priority?: boolean; /** 2 when the cards sit right under the page's h1. */ headingLevel?: 2 | 3 }) {
  const [low, high] = trip.budgetRange
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Link to={`/t/${trip.slug}`} className="lift group block overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <img {...responsiveImage(trip.coverImage, FEED_SIZES)} alt="" loading={priority ? 'eager' : 'lazy'} {...fetchPriority(priority ? 'high' : undefined)} decoding="async" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        <Badge className="absolute left-3 top-3 bg-surface/95 shadow-sm">
          <CalendarDays aria-hidden className="size-4 text-primary" />{trip.durationDays} days
        </Badge>
      </div>
      <div className="space-y-1.5 p-4">
        <Heading className="line-clamp-2 text-lg font-bold leading-snug">{trip.title}</Heading>
        <p className="text-sm text-fg-muted">by {trip.ownerName}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
          {high.amount > 0 && <span className="font-semibold text-fg">{formatMoney(low)}–{formatMoney(high)}</span>}
          <span className="inline-flex items-center gap-1"><Bookmark aria-hidden className="size-4" />{trip.saveCount.toLocaleString('en-IN')}<span className="sr-only"> saves</span></span>
        </p>
      </div>
    </Link>
  )
}
