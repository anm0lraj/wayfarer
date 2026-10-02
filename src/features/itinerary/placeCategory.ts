import type { ItemCategory, Place } from '@/types'

/** Itinerary category for a place when it is added to a day. */
export function itemCategoryForPlace(p: Pick<Place, 'kind' | 'tags'>): ItemCategory {
  if (p.kind === 'restaurant') return 'food'
  if (p.kind === 'airport' || p.kind === 'transport') return 'transport'
  if (p.kind === 'shop') return 'shopping'
  if (p.tags.includes('sunset')) return 'sunset'
  if (p.tags.includes('beaches')) return 'beach'
  if (p.kind === 'activity') return 'activity'
  return 'sightseeing'
}
