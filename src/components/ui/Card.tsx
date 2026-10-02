import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Plain surface. Use sparingly — prefer layout and spacing over wrapping everything in cards. */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border border-border bg-surface shadow-sm', className)} {...props} />
))
Card.displayName = 'Card'
