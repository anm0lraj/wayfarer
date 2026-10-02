import { CATEGORY_META } from '@/features/itinerary/categoryMeta'
import { cn } from '@/lib/cn'
import type { NewDayInput } from '@/types'

/** Read-only list of the activities in a proposed day. */
export function DayPreview({ day, title, className }: { day: NewDayInput; title?: string; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-3', className)}>
      {title && <h4 className="mb-2 font-semibold">{title}</h4>}
      {day.items.length === 0 ? (
        <p className="text-sm text-fg-muted">Nothing planned.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {day.items.map((i, idx) => {
            const Icon = CATEGORY_META[i.category].icon
            return (
              <li key={`${i.title}-${idx}`} className="flex items-center gap-2">
                <span className="w-11 shrink-0 tabular-nums text-fg-muted">{i.startTime}</span>
                <Icon aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
                <span className="truncate">{i.title}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
