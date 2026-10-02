import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { ItemStatus } from '@/types'
import { STATUS_LABEL, type LiveItem } from './liveStatus'
import { STATUS_ICON } from './statusIcons'

const ORDER: ItemStatus[] = ['upcoming', 'on_the_way', 'in_progress', 'completed', 'skipped']

interface Props {
  live: LiveItem | undefined
  onClose: () => void
  onChange: (item: LiveItem['item'], status: ItemStatus) => void
}

/** Pick any of the five statuses for an activity. Large rows so it works one-handed. */
export function StatusSheet({ live, onClose, onChange }: Props) {
  return (
    <ResponsiveSheet open={!!live} onOpenChange={(o) => !o && onClose()} title={live?.item.title ?? 'Update status'} description="Where are you with this activity?">
      <div role="group" aria-label="Activity status" className="grid gap-2 px-5 pb-6">
        {live &&
          ORDER.map((status) => {
            const Icon = STATUS_ICON[status]
            const selected = live.status === status
            return (
              <Button
                key={status}
                variant={selected ? 'primary' : 'secondary'}
                aria-pressed={selected}
                className={cn('min-h-14 justify-start text-base')}
                onClick={() => { onChange(live.item, status); onClose() }}
              >
                <Icon aria-hidden className="size-5" /> {STATUS_LABEL[status]}
                {selected && live.auto && <span className="ml-auto text-sm font-normal opacity-80">set from the time</span>}
              </Button>
            )
          })}
      </div>
    </ResponsiveSheet>
  )
}
