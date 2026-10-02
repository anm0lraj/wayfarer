import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '@/components/feedback/States'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { itineraryRepo } from '@/data/repositories'
import { useServices } from '@/services'
import { AIUnavailableError } from '@/services/ai/types'
import { newDayInputSchema, type ItineraryDay, type ItineraryItem, type NewDayInput, type Trip } from '@/types'
import { DayPreview } from './DayPreview'

type State = { status: 'loading' } | { status: 'error'; unavailable: boolean } | { status: 'preview'; after: NewDayInput }

/** Regenerate one day: shows the current day beside the proposal, and only replaces it when you confirm. */
export function RegenerateDaySheet({ trip, day, items, open, onClose }: { trip: Trip; day: ItineraryDay; items: ItineraryItem[]; open: boolean; onClose: () => void }) {
  const { ai } = useServices()
  const qc = useQueryClient()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [applying, setApplying] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const current: NewDayInput = {
    title: day.title,
    items: items.map((i) => ({ title: i.title, startTime: i.startTime, durationMin: i.durationMin, category: i.category, placeId: i.placeId })),
  }

  const run = async () => {
    abort.current?.abort()
    const ctrl = (abort.current = new AbortController())
    setState({ status: 'loading' })
    try {
      const diff = await ai.regenerateDay(
        { destinationId: day.destinationId ?? trip.destinationIds[0]!, days: 1, interests: trip.interests, dayNumber: day.dayNumber, current: items.map((i) => i.title) },
        ctrl.signal,
      )
      if (!ctrl.signal.aborted) setState({ status: 'preview', after: newDayInputSchema.parse(diff.after) })
    } catch (e) {
      if (!ctrl.signal.aborted) setState({ status: 'error', unavailable: e instanceof AIUnavailableError })
    }
  }

  useEffect(() => {
    if (open) void run()
    return () => abort.current?.abort()
    // one request per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const apply = async (after: NewDayInput) => {
    setApplying(true)
    try {
      const snapshot = await itineraryRepo.replaceDayItems(day.id, after.items)
      await qc.invalidateQueries({ queryKey: ['trips'] })
      toast({ title: `Day ${day.dayNumber} replaced`, action: { label: 'Undo', onClick: () => void itineraryRepo.restoreDay(snapshot).then(() => qc.invalidateQueries({ queryKey: ['trips'] })) } })
      onClose()
    } catch (e) {
      toast({ title: 'Couldn’t replace the day', description: e instanceof Error ? e.message : undefined })
    } finally {
      setApplying(false)
    }
  }

  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => !o && onClose()} title={`Regenerate Day ${day.dayNumber}`} description="Compare the proposal with your current plan before changing anything." wide="dialog">
      {state.status === 'loading' && <div role="status" aria-label="Drafting a new day" className="space-y-3 py-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-32" /></div>}
      {state.status === 'error' && (
        <ErrorState
          title={state.unavailable ? 'The AI assistant isn’t available right now' : 'Couldn’t regenerate this day'}
          description="Your current plan is unchanged."
          onRetry={() => void run()}
          className="py-6"
        />
      )}
      {state.status === 'preview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DayPreview day={current} title="Current" />
            <DayPreview day={state.after} title="Proposed" className="border-primary/50 bg-primary/5" />
          </div>
          <p className="text-sm text-fg-muted">Replacing swaps the whole day. You can undo it right after.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>Keep current day</Button>
            <Button variant="secondary" onClick={() => void run()}>Try another</Button>
            <Button disabled={applying || state.after.items.length === 0} onClick={() => void apply(state.after)}>{applying ? 'Replacing…' : 'Replace this day'}</Button>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  )
}
