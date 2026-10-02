import { format } from 'date-fns'
import { FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useClockStore } from '@/services/clock/clock'

/** Shown whenever the demo date simulator is on, so nobody mistakes simulated time for real time. */
export function DemoClockBanner() {
  const { simulatedNow, setSimulatedNow } = useClockStore()
  if (!simulatedNow) return null
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-fg">
      <span className="inline-flex items-center gap-2"><FlaskConical aria-hidden className="size-4" /> Demo date: {format(new Date(simulatedNow), 'd MMM yyyy, HH:mm')}</span>
      <Button variant="ghost" size="sm" className="min-h-touch text-secondary-fg underline hover:bg-white/10" onClick={() => setSimulatedNow(null)}>
        Back to today
      </Button>
    </div>
  )
}
