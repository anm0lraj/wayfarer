import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { ErrorState } from '@/components/feedback/States'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDestinations } from '@/data/queries/catalog'
import type { TripPlan } from '@/data/queries/plan'
import { applyAIAction } from '@/data/repositories'
import { tripLengthDays } from '@/lib/dates'
import { useServices } from '@/services'
import { AIUnavailableError } from '@/services/ai/types'
import type { NewDayInput, Trip } from '@/types'
import { generateDays } from '../generate'
import { DayPreview } from './DayPreview'

type State = { status: 'idle' } | { status: 'loading' } | { status: 'error'; unavailable: boolean } | { status: 'preview'; days: NewDayInput[] }

/** Draft a whole itinerary. Nothing is saved until you press Apply, and Apply can be undone. */
export function GenerateItinerarySheet({ trip, plan, open, onClose }: { trip: Trip; plan?: TripPlan; open: boolean; onClose: () => void }) {
  const { ai } = useServices()
  const qc = useQueryClient()
  const destinations = useDestinations()
  const [state, setState] = useState<State>({ status: 'idle' })
  const [applying, setApplying] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const existing = plan?.items.length ?? 0

  const generate = async () => {
    abort.current?.abort()
    const ctrl = (abort.current = new AbortController())
    setState({ status: 'loading' })
    try {
      const chosen = trip.destinationIds.map((id) => destinations.data?.find((d) => d.id === id)).filter((d) => !!d)
      const { days } = await generateDays(ai, chosen, { totalDays: tripLengthDays(trip.startDate, trip.endDate), interests: trip.interests, budgetTotal: trip.budget.total?.amount }, ctrl.signal)
      if (!ctrl.signal.aborted) setState({ status: 'preview', days })
    } catch (e) {
      if (!ctrl.signal.aborted) setState({ status: 'error', unavailable: e instanceof AIUnavailableError })
    }
  }

  useEffect(() => {
    if (open) { setState({ status: 'idle' }); if (destinations.data) void generate() }
    return () => abort.current?.abort()
    // start once per opening, as soon as destinations are known
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, !!destinations.data])

  const apply = async (days: NewDayInput[]) => {
    setApplying(true)
    try {
      const result = await applyAIAction(trip.id, { type: 'CREATE_ITINERARY', days })
      await qc.invalidateQueries({ queryKey: ['trips'] })
      toast({ title: 'Itinerary added', description: result.summary, action: { label: 'Undo', onClick: () => void result.undo().then(() => qc.invalidateQueries({ queryKey: ['trips'] })) } })
      onClose()
    } catch (e) {
      toast({ title: 'Couldn’t add the itinerary', description: e instanceof Error ? e.message : undefined })
    } finally {
      setApplying(false)
    }
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title="Draft an itinerary" description={`A day-by-day plan for ${trip.title}, based on your interests.`} wide="dialog">
      {(state.status === 'idle' || state.status === 'loading') && (
        <div role="status" aria-label="Drafting your itinerary" className="space-y-3 py-2">
          <p className="flex items-center gap-2 text-fg-muted"><Sparkles aria-hidden className="size-4 motion-safe:animate-pulse" /> Drafting your itinerary…</p>
          <Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
      )}
      {state.status === 'error' && (
        <ErrorState
          title={state.unavailable ? 'The AI assistant isn’t available right now' : 'Couldn’t draft an itinerary'}
          description={state.unavailable ? 'You can try again in a moment, or plan the days yourself.' : 'Please try again.'}
          onRetry={() => void generate()}
          className="py-6"
        />
      )}
      {state.status === 'preview' && (
        <div className="space-y-4">
          {state.days.length === 0 ? (
            <p className="py-4 text-fg-muted">We don’t have place suggestions for this destination yet. You can still add your own stops.</p>
          ) : (
            <>
              {existing > 0 && <p role="note" className="rounded-md bg-warning/15 px-3 py-2 text-sm text-warning">Your trip already has {existing} {existing === 1 ? 'activity' : 'activities'}. These will be added after them.</p>}
              <div className="max-h-[50dvh] space-y-2 overflow-y-auto pr-1">
                {state.days.map((d, i) => <DayPreview key={i} day={d} title={`Day ${i + 1}${d.title && d.title !== `Day ${i + 1}` ? ` · ${d.title}` : ''}`} />)}
              </div>
            </>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="secondary" onClick={() => void generate()}>Try another draft</Button>
            {state.days.length > 0 && <Button disabled={applying} onClick={() => void apply(state.days)}>{applying ? 'Adding…' : 'Add to my trip'}</Button>}
          </div>
        </div>
      )}
    </ResponsiveSheet>
  )
}
