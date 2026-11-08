import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

// Tinted tones are the colour at 12% under text in that colour; src/styles/contrast.test.ts checks every tone on
// cards, grey panels and the page (BADGE_TINT there must match). `accent` is the solid orange "happening now" badge.
const chip = cva('inline-flex items-center gap-1.5 rounded-full text-sm font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-fg',
      primary: 'bg-primary/[0.12] text-primary',
      success: 'bg-success/[0.12] text-success',
      warning: 'bg-warning/[0.12] text-warning',
      error: 'bg-error/[0.12] text-error',
      accent: 'bg-accent text-accent-fg',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

/** Static label / status badge. */
export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chip>) {
  return <span className={cn(chip({ tone }), 'px-2.5 py-0.5', className)} {...props} />
}

/** Selectable filter/interest chip — a pill toggle button with a 44px hit area; selected is solid Electric Blue. */
export const Chip = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }>(
  ({ className, selected = false, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-touch items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-fast ease-out',
        selected
          ? 'border-primary bg-primary text-primary-fg shadow-primary'
          : 'border-border-strong bg-surface text-fg hover:border-primary hover:bg-primary/5 hover:text-primary',
        className,
      )}
      {...props}
    />
  ),
)
Chip.displayName = 'Chip'
