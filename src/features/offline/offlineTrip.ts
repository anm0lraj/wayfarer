import { db } from '@/data/db'
import { tripRepo } from '@/data/repositories'
import type { Trip } from '@/types'

export interface OfflineSummary {
  days: number
  stops: number
  stays: number
  flights: number
  memories: number
  /** The browser agreed to keep this data even under storage pressure. */
  persistent: boolean
}

/** Counts what is stored on this device for the trip. Everything the app reads lives in IndexedDB. */
export async function summariseOffline(tripId: string): Promise<Omit<OfflineSummary, 'persistent'>> {
  const [days, stops, bookings, memories] = await Promise.all([
    db.days.where('tripId').equals(tripId).count(),
    db.items.where('tripId').equals(tripId).count(),
    db.bookings.where('tripId').equals(tripId).toArray(),
    db.memories.where('tripId').equals(tripId).count(),
  ])
  return { days, stops, stays: bookings.filter((b) => b.type === 'hotel').length, flights: bookings.filter((b) => b.type === 'flight').length, memories }
}

/** Remote images used by the trip. Fetching them lets the service worker's image cache keep them for offline use. */
async function remoteImages(trip: Trip): Promise<string[]> {
  const items = await db.items.where('tripId').equals(trip.id).toArray()
  const placeIds = [...new Set(items.map((i) => i.placeId).filter((x): x is string => !!x))]
  const places = (await db.places.bulkGet(placeIds)).flatMap((p) => p?.images ?? [])
  return [...new Set([trip.coverImage, ...items.map((i) => i.image), ...places].filter((u): u is string => !!u && /^https?:/.test(u)))]
}

/**
 * "Available offline": asks the browser to keep this device's data (persistent storage), warms the image
 * cache, and records the choice on the trip. Map tiles are deliberately not bulk-downloaded — the OpenStreetMap
 * tile policy forbids it — so the map shows areas you've already viewed.
 */
export async function makeAvailableOffline(trip: Trip): Promise<OfflineSummary> {
  const persistent = (await navigator.storage?.persist?.().catch(() => false)) ?? false
  await Promise.allSettled((await remoteImages(trip)).map((u) => fetch(u, { mode: 'no-cors' })))
  await tripRepo.update(trip.id, { offlineAvailable: true })
  return { ...(await summariseOffline(trip.id)), persistent }
}

export async function removeOfflineMark(trip: Trip): Promise<void> {
  await tripRepo.update(trip.id, { offlineAvailable: false })
}
