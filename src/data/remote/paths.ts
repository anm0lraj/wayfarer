import type { SyncOp } from '../db'

/**
 * Where each synced table lives in Firestore. The layout is chosen so the security rules can answer "may this person
 * touch this?" from the path alone:
 *
 *   trips/{tripId}                      the trip; `members` maps uid -> owner | editor | viewer (kept by sync, rules read it)
 *   trips/{tripId}/{days,items,…}/{id}  everything that belongs to a trip, readable by members, writable by editors
 *   users/{uid}                         the profile
 *   users/{uid}/{savedTrips,…}/{id}     private to that person
 *   publicTrips/{id}                    published snapshots, readable by anyone
 *
 * Catalogue tables (destinations, places, hotels, flights) are reference data shipped with the app and are not synced.
 */
export const TRIP_CHILDREN = ['days', 'items', 'bookings', 'checklist', 'memories', 'stories', 'collaborators'] as const
/** Photos and voice notes (`trips/{id}/media`). Written by the storage adapter rather than synced like the tables above, but removed with the trip. */
export const TRIP_MEDIA = 'media'
export const USER_COLLECTIONS = ['savedTrips', 'savedPlaces', 'likedTrips', 'notifications', 'aiConversations', 'aiMessages'] as const

const tripChildren = new Set<string>(TRIP_CHILDREN)
const userCollections = new Set<string>(USER_COLLECTIONS)

/** The slash-separated document path for a queued change, or null when it must not be sent (reference data, unknown). */
export function docPathFor(op: Pick<SyncOp, 'entity' | 'entityId' | 'payload'>, uid: string): string | null {
  const { entity, entityId } = op
  // `publicSlugs` maps a page's URL slug to its published trip, so a page can be opened by link without being listed.
  if (entity === 'trips' || entity === 'publicTrips' || entity === 'publicSlugs') return `${entity}/${entityId}`
  if (entity === 'users') return entityId === uid ? `users/${uid}` : null // never write another person's profile
  if (userCollections.has(entity)) return `users/${uid}/${entity}/${entityId}`
  if (tripChildren.has(entity)) {
    const tripId = (op.payload as { tripId?: string } | undefined)?.tripId
    return tripId ? `trips/${tripId}/${entity}/${entityId}` : null
  }
  return null
}

/** Which table a Firestore document belongs to (for pulling), from its collection name. */
export const isTripChild = (name: string) => tripChildren.has(name)
