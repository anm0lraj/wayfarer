import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTripPlan } from '@/data/queries/plan'
import { useOnline } from '@/lib/hooks/useOnline'
import { useServices } from '@/services'
import { schedulePlacePhotos } from './autoPhotos'

/**
 * Mounted in the trip workspace: whenever the plan's custom places change (a stop added, its pin moved) or the device
 * comes back online, looks for photos in the background. Renders nothing and never blocks or reports anything.
 */
export function PlacePhotoRunner({ tripId }: { tripId: string }) {
  const { placePhotos } = useServices()
  const qc = useQueryClient()
  const plan = useTripPlan(tripId).data
  const online = useOnline()
  // Only what decides whether a search is due, so unrelated edits (times, notes) don't start a pass.
  const signature = plan?.items
    .filter((i) => (!i.placeId && i.customLocation) || i.autoPhoto)
    .map((i) => `${i.id}:${i.category}:${i.placeId ?? ''}:${i.customLocation?.name ?? ''}:${i.autoPhoto?.query ?? ''}`)
    .join('|')

  useEffect(() => {
    if (!signature || !online) return
    void schedulePlacePhotos({ tripId, service: placePhotos, qc })
  }, [signature, online, tripId, placePhotos, qc])
  return null
}
