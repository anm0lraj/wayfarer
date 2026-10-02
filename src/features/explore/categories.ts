import type { DestinationCategory } from '@/types'

export const EXPLORE_CATEGORIES: Array<{ id: DestinationCategory; label: string }> = [
  { id: 'trending', label: 'Trending' }, { id: 'weekend', label: 'Weekend trips' }, { id: 'beaches', label: 'Beaches' },
  { id: 'mountains', label: 'Mountains' }, { id: 'food', label: 'Food' }, { id: 'adventure', label: 'Adventure' },
  { id: 'international', label: 'International' }, { id: 'budget', label: 'Budget trips' },
]
