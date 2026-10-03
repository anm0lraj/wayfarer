import { db } from '@/data/db'
import type { CatalogueEntry } from '@/services/ai/types'

/** The most places sent with a request: enough to choose from, small enough to keep each message cheap. */
const MAX_ATTRACTIONS = 60
const MAX_RESTAURANTS = 25

/**
 * The places the assistant may recommend for a destination. A real model knows nothing about this app's catalogue, so
 * the app sends a trimmed list (best-rated first) and the server only accepts proposals that use ids from it.
 */
export async function catalogueFor(destinationId: string): Promise<CatalogueEntry[]> {
  const all = await db.places.where('destinationId').equals(destinationId).toArray()
  const byRating = (a: { rating?: number }, b: { rating?: number }) => (b.rating ?? 0) - (a.rating ?? 0)
  const eats = all.filter((p) => p.kind === 'restaurant').sort(byRating).slice(0, MAX_RESTAURANTS)
  const sights = all.filter((p) => p.kind !== 'restaurant' && p.kind !== 'airport' && p.kind !== 'transport').sort(byRating).slice(0, MAX_ATTRACTIONS)
  return [...sights, ...eats].map((p) => ({
    id: p.id, name: p.name, kind: p.kind, tags: p.tags.slice(0, 8), rating: p.rating, lat: p.location.lat, lng: p.location.lng,
    durationMin: p.typicalDurationMin, costInr: p.costEstimate?.currency === 'INR' ? p.costEstimate.amount : undefined,
  }))
}
