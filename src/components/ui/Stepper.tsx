import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Step progress indicator for multi-step flows. Announces "Step 2 of 6: Dates". */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <nav aria-label="Progress" className={className}>
      <p className="sr-only" aria-live="polite">Step {current + 1} of {steps.length}: {steps[current]}</p>
      <ol className="flex items-center gap-1.5" aria-hidden>
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                i < current && 'bg-primary text-primary-fg',
                i === current && 'bg-primary text-primary-fg ring-4 ring-primary/20',
                i > current && 'bg-surface-2 text-fg-muted',
              )}
            >
              {i < current ? <Check className="size-3.5" /> : i + 1}
            </span>
            {i < steps.length - 1 && <span className={cn('h-0.5 flex-1 rounded-full', i < current ? 'bg-primary' : 'bg-surface-2')} />}
          </li>
        ))}
      </ol>
    </nav>
  )
}
