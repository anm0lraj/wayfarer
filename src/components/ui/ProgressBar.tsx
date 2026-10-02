import { cn } from '@/lib/cn'

/** Determinate progress (e.g. planning 72%). Announced as a progressbar with its own label. */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  )
}
