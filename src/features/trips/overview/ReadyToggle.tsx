import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import type { TripWithState } from '@/data/queries/trips'
import { tripRepo } from '@/data/repositories'
import type { StoredTripState } from '@/types'

/**
 * "Mark as ready" for a trip being planned, "Back to planning" for a ready one. Ready is the only way into Upcoming
 * (`computeTripState` derives it in the last two weeks), so the traveller decides when planning is done. Undoable.
 */
export function ReadyToggle({ trip }: { trip: TripWithState }) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const ready = trip.state === 'ready'
  if (trip.state !== 'planning' && !ready) return null

  const move = async (to: StoredTripState) => {
    await tripRepo.transition(trip.id, to)
    await qc.invalidateQueries()
  }
  const toggle = async () => {
    const [to, back]: [StoredTripState, StoredTripState] = ready ? ['planning', 'ready'] : ['ready', 'planning']
    setBusy(true)
    try {
      await move(to)
      toast({
        title: ready ? 'Back to planning' : 'Trip marked as ready',
        description: ready ? undefined : 'It shows as Upcoming in the two weeks before you leave.',
        action: { label: 'Undo', onClick: () => void move(back).catch(() => toast({ title: 'Couldn’t undo that' })) },
      })
    } catch (e) {
      toast({ title: ready ? 'Couldn’t move the trip back to planning' : 'Couldn’t mark the trip as ready', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant={ready ? 'secondary' : 'primary'} size="sm" disabled={busy} onClick={() => void toggle()}>
      {ready ? 'Back to planning' : 'Mark as ready'}
    </Button>
  )
}
