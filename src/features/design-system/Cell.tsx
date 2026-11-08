import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ForcedState = 'hover' | 'focus' | 'active'

const forcedLabel: Record<ForcedState, string> = { hover: 'hover', focus: 'focus-visible', active: 'pressed' }

/**
 * One variant or state in an example, with its label underneath. `force` pins the component's real hover /
 * focus-visible / pressed CSS (see forcedStates.ts). `wide` lets the cell take the full row.
 */
export function Cell({ label, force, wide, children }: { label: string; force?: ForcedState; wide?: boolean; children: ReactNode }) {
  return (
    <div data-ds-cell={label} className={cn('flex min-w-0 flex-col items-start gap-2', wide && 'w-full [&>div]:w-full')}>
      <div className={force ? `ds-force-${force}` : undefined}>{children}</div>
      <span className="text-xs font-medium text-fg-muted">
        {label}{force && <span className="sr-only"> (pinned {forcedLabel[force]} look)</span>}
      </span>
    </div>
  )
}
