import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/** One choice in a single-select group. Render inside a `role="radiogroup"` container. */
export function OptionCard({ selected, onSelect, title, description, icon }: {
  selected: boolean
  onSelect: () => void
  title: string
  description?: string
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-touch w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors',
        selected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border-strong bg-surface hover:bg-surface-2',
      )}
    >
      {icon && <span aria-hidden className="mt-0.5 text-primary">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-fg-muted">{description}</span>}
      </span>
      <span aria-hidden className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', selected ? 'border-primary bg-primary text-primary-fg' : 'border-border')}>
        {selected && <Check className="size-3.5" />}
      </span>
    </button>
  )
}
