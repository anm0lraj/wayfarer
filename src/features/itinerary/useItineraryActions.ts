import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/feedback/toast'
import type { TripPlan } from '@/data/queries/plan'
import { itineraryRepo } from '@/data/repositories'
import type { ItineraryItem, NewItemInput } from '@/types'
import { optimisticMove, optimisticRemove, optimisticReorder, optimisticUpdate } from './planCache'

/**
 * Itinerary edits for one trip. Each write updates the cached plan immediately (so the UI never waits on
 * IndexedDB), rolls back and tells the user if it fails, and always refreshes from the source of truth after.
 */
export function useItineraryActions(tripId: string) {
  const qc = useQueryClient()
  return useMemo(() => {
    const key = ['trips', tripId, 'plan'] as const
    const refresh = () => qc.invalidateQueries({ queryKey: ['trips', tripId] })

    async function run<T>(failure: string, action: () => Promise<T>, optimistic?: (plan: TripPlan) => TripPlan): Promise<T | undefined> {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<TripPlan>(key)
      if (optimistic && previous) qc.setQueryData(key, optimistic(previous))
      try {
        return await action()
      } catch (e) {
        if (previous) qc.setQueryData(key, previous)
        toast({ title: failure, description: e instanceof Error ? e.message : undefined })
        return undefined
      } finally {
        await refresh()
      }
    }

    return {
      reorder: (dayId: string, orderedIds: string[]) => run('Couldn’t reorder', () => itineraryRepo.reorder(dayId, orderedIds), (p) => optimisticReorder(p, dayId, orderedIds)),

      moveToDay: (item: ItineraryItem, toDayId: string, dayNumber: number, toIndex?: number) =>
        run('Couldn’t move that', async () => {
          await itineraryRepo.moveItem(item.id, toDayId, toIndex ?? Number.MAX_SAFE_INTEGER)
          toast({
            title: `Moved to Day ${dayNumber}`, description: item.title,
            action: { label: 'Undo', onClick: () => void itineraryRepo.moveItem(item.id, item.dayId, item.position).then(refresh) },
          })
        }, (p) => optimisticMove(p, item.id, toDayId, toIndex)),

      remove: (item: ItineraryItem) =>
        run('Couldn’t delete that', async () => {
          const removed = await itineraryRepo.removeItem(item.id)
          toast({ title: 'Activity deleted', description: removed.title, action: { label: 'Undo', onClick: () => void itineraryRepo.restoreItem(removed).then(refresh) } })
        }, (p) => optimisticRemove(p, item.id)),

      duplicate: (item: ItineraryItem) =>
        run('Couldn’t duplicate that', async () => {
          const copy = await itineraryRepo.duplicateItem(item.id)
          toast({ title: 'Activity duplicated', description: copy.title, action: { label: 'Undo', onClick: () => void itineraryRepo.removeItem(copy.id).then(refresh) } })
        }),

      add: (dayId: string, dayNumber: number, input: NewItemInput & Partial<Pick<ItineraryItem, 'image' | 'notes'>>) =>
        run('Couldn’t add that', async () => {
          const item = await itineraryRepo.addItem(tripId, dayId, input)
          toast({ title: `Added to Day ${dayNumber}`, description: item.title, action: { label: 'Undo', onClick: () => void itineraryRepo.removeItem(item.id).then(refresh) } })
          return item
        }),

      update: (id: string, patch: Partial<ItineraryItem>) => run('Couldn’t save your changes', () => itineraryRepo.updateItem(id, patch), (p) => optimisticUpdate(p, id, patch)),

      retimeDay: (dayId: string) =>
        run('Couldn’t re-time the day', async () => {
          const previous = await itineraryRepo.retimeDay(dayId)
          toast({ title: 'Day re-timed', description: 'Start times now leave room for travel.', action: { label: 'Undo', onClick: () => void itineraryRepo.setTimes(previous).then(refresh) } })
        }),

      refresh,
    }
  }, [qc, tripId])
}
