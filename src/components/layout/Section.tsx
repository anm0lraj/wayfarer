import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Titled content block with an optional "See all" link. Heading level is fixed at h2 (page title is the h1). */
export function Section({ title, description, to, linkLabel = 'See all', children, className }: {
  title: string
  description?: string
  to?: string
  linkLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {to && (
          <Link to={to} className="inline-flex min-h-touch shrink-0 items-center gap-0.5 text-sm font-semibold text-primary hover:underline">
            {linkLabel} <ChevronRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * Phone: horizontally scrollable row with snap. Tablet/desktop: a responsive grid. Children should be
 * wrapped in <li>; each is sized here so cards don't have to know where they are shown.
 */
export function CardRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ul
      className={cn(
        '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-4',
        '[&>li]:w-[72%] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-auto',
        className,
      )}
    >
      {children}
    </ul>
  )
}
