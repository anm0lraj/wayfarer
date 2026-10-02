import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Loading placeholder with a fixed size so content doesn't shift when it arrives. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-2', className)} {...props} />
}

/** Wrap skeleton groups so assistive tech hears "Loading" once instead of nothing. */
export function SkeletonGroup({ label = 'Loading', children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return <div role="status" aria-busy="true" aria-label={label} className={className}>{children}</div>
}
