import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const chip = cva('inline-flex items-center gap-1.5 rounded-full text-sm font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-fg',
      primary: 'bg-primary/15 text-primary',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/15 text-warning',
      error: 'bg-error/15 text-error',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

/** Static label / status badge. */
export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chip>) {
  return <span className={cn(chip({ tone }), 'px-2.5 py-0.5', className)} {...props} />
}

/** Selectable filter/interest chip — a toggle button with a 44px hit area. */
export const Chip = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }>(
  ({ className, selected = false, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-touch items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
        selected ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong bg-surface text-fg hover:bg-surface-2',
        className,
      )}
      {...props}
    />
  ),
)
Chip.displayName = 'Chip'
