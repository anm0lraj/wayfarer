import { forwardRef, type HTMLAttributes } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, ArrowDown, ArrowUp, CalendarPlus, ChevronRight, Copy, GripVertical, MoreVertical, Navigation, Trash2 } from 'lucide-react'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/Menu'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { ItineraryDay, ItineraryItem } from '@/types'
import { CATEGORY_META } from '../categoryMeta'
import { endTime, type ScheduleWarning } from '../schedule'

export interface ItemCardActions {
  onOpen: (item: ItineraryItem) => void
  onSelect: (item: ItineraryItem) => void
  onMove: (item: ItineraryItem, by: -1 | 1) => void
  onMoveToDay: (item: ItineraryItem, day: ItineraryDay) => void
  onDuplicate: (item: ItineraryItem) => void
  onDelete: (item: ItineraryItem) => void
}

interface ItemCardProps extends ItemCardActions {
  item: ItineraryItem
  index: number
  count: number
  days: ItineraryDay[]
  warning?: ScheduleWarning
  selected: boolean
  /** When the map is beside the list, tapping selects (and highlights the pin); otherwise it opens details. */
  splitView: boolean
  directionsHref?: string
}

/** Presentational card; draggable behaviour comes from the wrappers below. */
export const ItemCardBody = forwardRef<HTMLDivElement, ItemCardProps & { handle?: HTMLAttributes<HTMLButtonElement>; dragging?: boolean; style?: React.CSSProperties }>(
  ({ item, index, count, days, selected, splitView, warning, directionsHref, handle, dragging, style, ...a }, ref) => {
    const meta = CATEGORY_META[item.category]
    const Icon = meta.icon
    const others = days.filter((d) => d.id !== item.dayId)
    const open = () => (splitView ? a.onSelect(item) : a.onOpen(item))
    return (
      <div ref={ref} id={`item-${item.id}`} style={style} className={cn('relative', dragging && 'z-10 opacity-60')}>
        {item.travelTimeFromPrevMin !== undefined && (
          <div className="ml-[3.75rem] flex items-center gap-1.5 py-1.5 text-xs text-fg-muted">
            <Navigation aria-hidden className="size-3.5" />
            <span>{item.travelTimeFromPrevMin} min · {item.distanceFromPrevKm} km</span>
          </div>
        )}
        {warning && (
          <p role="note" className="mb-1.5 ml-[3.75rem] flex items-start gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{warning.message}</span>
          </p>
        )}
        <div className="flex gap-2">
          <div className="w-14 shrink-0 pt-3 text-right">
            <p className="text-sm font-semibold tabular-nums">{item.startTime}</p>
            <p className="text-xs tabular-nums text-fg-muted">{endTime(item)}</p>
          </div>
          <div className={cn('flex min-w-0 flex-1 items-stretch rounded-lg border bg-surface shadow-sm', selected ? 'border-primary ring-2 ring-primary/30' : 'border-border')}>
            <button
              type="button"
              {...handle}
              aria-label={`Reorder ${item.title}. Press space to pick up, arrow keys to move.`}
              className="grid w-9 shrink-0 cursor-grab touch-none place-items-center rounded-l-lg text-fg-muted hover:bg-surface-2 active:cursor-grabbing"
            >
              <GripVertical aria-hidden className="size-4" />
            </button>
            <button type="button" onClick={open} aria-current={selected || undefined} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-1 text-left">
              <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-full', meta.tone)}><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-semibold leading-snug">{item.title}</span>
                <span className="block truncate text-sm text-fg-muted">
                  {meta.label} · {item.durationMin >= 60 ? `${+(item.durationMin / 60).toFixed(1)} h` : `${item.durationMin} min`}
                  {item.estimatedCost ? ` · ${item.estimatedCost.amount === 0 ? 'Free' : formatMoney(item.estimatedCost)}` : ''}
                </span>
              </span>
            </button>
            {splitView && (
              <button type="button" onClick={() => a.onOpen(item)} aria-label={`Open details for ${item.title}`} className="grid min-w-touch place-items-center text-fg-muted hover:text-fg">
                <ChevronRight aria-hidden className="size-4" />
              </button>
            )}
            <Menu
              trigger={
                <button type="button" aria-label={`Actions for ${item.title}`} className="grid min-w-touch place-items-center rounded-r-lg text-fg-muted hover:bg-surface-2 hover:text-fg">
                  <MoreVertical aria-hidden className="size-4" />
                </button>
              }
            >
              <MenuItem onSelect={() => a.onOpen(item)}>View & edit details</MenuItem>
              {directionsHref && <MenuItem onSelect={() => window.open(directionsHref, '_blank', 'noopener')} icon={<Navigation className="size-4" />}>Directions</MenuItem>}
              <MenuSeparator />
              <MenuItem disabled={index === 0} onSelect={() => a.onMove(item, -1)} icon={<ArrowUp className="size-4" />}>Move up</MenuItem>
              <MenuItem disabled={index === count - 1} onSelect={() => a.onMove(item, 1)} icon={<ArrowDown className="size-4" />}>Move down</MenuItem>
              {others.length > 0 && <MenuLabel>Move to day</MenuLabel>}
              {others.map((d) => <MenuItem key={d.id} onSelect={() => a.onMoveToDay(item, d)} icon={<CalendarPlus className="size-4" />}>Day {d.dayNumber}{d.title ? ` · ${d.title}` : ''}</MenuItem>)}
              <MenuSeparator />
              <MenuItem onSelect={() => a.onDuplicate(item)} icon={<Copy className="size-4" />}>Duplicate</MenuItem>
              <MenuItem danger onSelect={() => a.onDelete(item)} icon={<Trash2 className="size-4" />}>Delete</MenuItem>
            </Menu>
          </div>
        </div>
      </div>
    )
  },
)
ItemCardBody.displayName = 'ItemCardBody'

/** Sortable wrapper wiring dnd-kit (pointer, touch and keyboard) to the card's drag handle. */
export function SortableItemCard(props: ItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id })
  return (
    <ItemCardBody
      {...props}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      handle={{ ...attributes, ...listeners } as HTMLAttributes<HTMLButtonElement>}
    />
  )
}
