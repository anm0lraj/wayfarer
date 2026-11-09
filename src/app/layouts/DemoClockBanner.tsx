import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { wallClockLabel } from '@/lib/dates'
import { useClockStore } from '@/services/clock/clock'

/**
 * Shown whenever the demo date simulator is on, so nobody mistakes simulated time for real time. The time is shown as
 * set (the trip's own clock, like the Live Trip card), with its offset, not converted to the browser's timezone.
 */
export function DemoClockBanner() {
  const { simulatedNow, setSimulatedNow } = useClockStore()
  if (!simulatedNow) return null
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 border-b border-live-border bg-live px-4 py-1 text-sm font-medium text-fg">
      <span className="inline-flex items-center gap-2"><FlaskConical aria-hidden className="size-4 text-secondary" /> Demo date: {wallClockLabel(simulatedNow)}</span>
      <Button variant="ghost" size="sm" className="min-h-touch text-primary underline hover:bg-primary/10" onClick={() => setSimulatedNow(null)}>
        Back to today
      </Button>
    </div>
  )
}
