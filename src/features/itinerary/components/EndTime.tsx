import type { ItineraryItem } from '@/types'
import { cn } from '@/lib/cn'
import { dayOffsetLabel, endClock } from '../schedule'

/**
 * A stop's end time for narrow columns. Past midnight the clock gets a compact "+1" mark (screen readers hear
 * "next day"), so "01:00 +1" never wraps in the itinerary's time column.
 */
export function EndTime({ item, className }: { item: Pick<ItineraryItem, 'startTime' | 'durationMin'>; className?: string }) {
  const { clock, days } = endClock(item)
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)} title={days ? `Ends ${clock}, ${dayOffsetLabel(days)}` : undefined}>
      {clock}
      {days > 0 && (
        <>
          <span aria-hidden className="ml-0.5 rounded-sm bg-primary/[0.12] px-0.5 text-[0.6875rem] font-bold text-primary">+{days}</span>
          <span className="sr-only"> {dayOffsetLabel(days)}</span>
        </>
      )}
    </span>
  )
}
