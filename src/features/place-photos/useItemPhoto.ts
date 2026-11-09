import { useQuery } from '@tanstack/react-query'
import { photoIdOf } from '@/lib/photos/responsive'
import type { ItineraryItem, Place, PlacePhotoCredit } from '@/types'

export interface ShownPhoto { url: string; alt: string; width?: number; height?: number; credit?: PlacePhotoCredit }

/** The catalogue credit for a self-hosted photo, loaded on demand (the credit list stays out of the screen's chunk). */
function useCatalogueCredit(id: string | undefined) {
  return useQuery({
    queryKey: ['photo-credit', id], enabled: !!id, staleTime: Infinity,
    queryFn: async () => {
      const { PHOTOS, commonsCredit } = await import('@/lib/photos')
      const p = PHOTOS[id!]
      return p ? { credit: commonsCredit(p), alt: p.title } : null
    },
  }).data
}

/**
 * The photo to show for an itinerary stop: the one found automatically for a custom place, else the catalogue photo of
 * its place. Undefined when there is only an illustration (nothing worth a large picture).
 */
export function useItemPhoto(item: ItineraryItem | undefined, place?: Place): ShownPhoto | undefined {
  const found = item?.autoPhoto?.photo
  const src = found ? undefined : item?.image ?? place?.images[0]
  const id = photoIdOf(src)
  const catalogue = useCatalogueCredit(id)
  if (found) return found
  if (!src || !id) return undefined
  return { url: src, alt: catalogue?.alt ?? item?.title ?? '', credit: catalogue?.credit }
}
