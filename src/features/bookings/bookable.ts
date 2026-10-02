import type { Booking, ItineraryItem } from '@/types'

const BOOKABLE = new Set(['activity', 'transport'])

/** Itinerary stops that could be reserved: activities, and transport that costs something. Already-saved ones drop out. */
export function bookableItems(items: ItineraryItem[], bookings: Booking[]): ItineraryItem[] {
  const saved = new Set(bookings.filter((b) => b.status !== 'cancelled').map((b) => b.refId))
  return items.filter((i) => BOOKABLE.has(i.category) && (i.category === 'activity' || (i.estimatedCost?.amount ?? 0) > 0) && !saved.has(i.id))
}
