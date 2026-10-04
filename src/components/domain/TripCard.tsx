import { CalendarDays, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Chip'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { stateLabel } from '@/features/trips/tripState'
import { formatDateRange, tripLengthDays } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Trip, TripState } from '@/types'

const tone: Record<TripState, 'neutral' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'neutral', planning: 'primary', ready: 'success', upcoming: 'success', active: 'error', completed: 'neutral', archived: 'neutral',
}

interface TripCardProps {
  trip: Trip
  state: TripState
  /** e.g. "18 days to go". */
  countdown?: string
  /** Planning completeness 0–100; shown for trips that are still being planned. */
  progress?: number
  className?: string
  /** In view when the page opens: load the cover at once instead of lazily. */
  priority?: boolean
}

/** Image on top, details below — the standard trip summary used on Home, Trips and Profile. */
export function TripCard({ trip, state, countdown, progress, className, priority }: TripCardProps) {
  const days = tripLengthDays(trip.startDate, trip.endDate)
  const showProgress = progress !== undefined && (state === 'draft' || state === 'planning' || state === 'ready' || state === 'upcoming')
  return (
    <Link
      to={`/trips/${trip.id}`}
      className={cn('group block overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow hover:shadow-md', className)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <img src={trip.coverImage} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
        <Badge tone={tone[state]} className="absolute left-3 top-3 bg-surface/95 shadow-sm backdrop-blur">
          {state === 'active' && <span aria-hidden className="size-1.5 rounded-full bg-error motion-safe:animate-pulse" />}
          {stateLabel[state]}
        </Badge>
      </div>
      <div className="space-y-2 p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-lg font-semibold leading-snug">{trip.title}</h3>
          {countdown && <span className="shrink-0 text-sm font-semibold text-primary">{countdown}</span>}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden className="size-4" />{formatDateRange(trip.startDate, trip.endDate)} · {days} {days === 1 ? 'day' : 'days'}</span>
          <span className="inline-flex items-center gap-1.5"><Users aria-hidden className="size-4" />{trip.travellers.count}<span className="sr-only"> travellers</span></span>
        </p>
        {showProgress && (
          <div className="space-y-1">
            <ProgressBar value={progress} label={`Planning ${Math.round(progress)}% complete`} />
            <p className="text-xs text-fg-muted">Planning {Math.round(progress)}% complete</p>
          </div>
        )}
      </div>
    </Link>
  )
}
