import type { KeyboardEvent, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Arrow keys move to (and choose) the previous / next option in the surrounding radiogroup, as a native radio group does. */
function moveInGroup(e: KeyboardEvent<HTMLButtonElement>) {
  const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
  if (!delta) return
  const group = e.currentTarget.closest('[role="radiogroup"]')
  const radios = group ? Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')) : []
  const i = radios.indexOf(e.currentTarget)
  if (i < 0 || radios.length < 2) return
  e.preventDefault()
  const next = radios[(i + delta + radios.length) % radios.length]!
  next.focus()
  next.click()
}

/** One choice in a single-select group. Render inside a `role="radiogroup"` container with an accessible name. */
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
      onKeyDown={moveInGroup}
      className={cn(
        'flex min-h-touch w-full items-start gap-3 rounded-lg border p-4 text-left transition-[border-color,background-color,box-shadow] duration-fast ease-out',
        selected ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary' : 'border-border-strong bg-surface hover:border-primary hover:shadow-sm',
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
