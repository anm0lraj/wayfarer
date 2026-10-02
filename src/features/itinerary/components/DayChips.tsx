import { useDroppable } from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { ItineraryDay } from '@/types'

/**
 * Day switcher. While dragging an activity, each chip is also a drop target: drop it on a day to move it there.
 * (Keyboard and menu users get "Move to day" in the activity menu instead.)
 */
export function DayChips({ tripId, days, activeDayId, counts, dragging }: { tripId: string; days: ItineraryDay[]; activeDayId: string; counts: Map<string, number>; dragging: boolean }) {
  return (
    <nav aria-label="Days" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-2 pb-1">
        {days.map((d) => (
          <li key={d.id} className="shrink-0">
            <DayChip tripId={tripId} day={d} active={d.id === activeDayId} count={counts.get(d.id) ?? 0} dragging={dragging} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function DayChip({ tripId, day, active, count, dragging }: { tripId: string; day: ItineraryDay; active: boolean; count: number; dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.id}` })
  const date = new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return (
    <Link
      ref={setNodeRef}
      to={`/trips/${tripId}/itinerary/day/${day.dayNumber}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-touch min-w-[4.5rem] flex-col items-center justify-center rounded-lg border px-3 py-1.5 text-center transition-colors',
        active ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface hover:bg-surface-2',
        dragging && !active && 'border-dashed border-primary/60',
        isOver && 'bg-primary/20 ring-2 ring-primary',
      )}
    >
      <span className="text-sm font-semibold">Day {day.dayNumber}</span>
      <span className={cn('text-xs', active ? 'text-primary-fg/85' : 'text-fg-muted')}>{date} · {count}</span>
    </Link>
  )
}
