import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where, type DocumentSnapshot, type QueryConstraint } from 'firebase/firestore'
import { getDb } from '@/services/firebase/firestore'
import { publicTripSchema } from '@/types'
import type { PublicTrip } from '@/types'

/**
 * Reading published trips from Firestore. Anyone can do this, signed in or not: a page opens by id or by its short
 * link, and only `public` trips can be listed. The caller keeps what it reads in a local cache (never synced back).
 */
export interface PublicPage { items: PublicTrip[]; nextCursor: string | null }
export interface PublicFilter { q?: string; destinationId?: string }

/**
 * A published trip as this app understands it. The document is checked against the schema, which also drops any field
 * it does not define: private notes, booking links and the like cannot reach a screen even if some other client wrote
 * them into the page. A document that does not fit is skipped (and said so in the console), not shown half-formed.
 */
function asTrip(snap: DocumentSnapshot): PublicTrip | undefined {
  const parsed = publicTripSchema.safeParse({ ...snap.data(), id: snap.id })
  if (!parsed.success) console.warn(`Skipping published trip ${snap.id}: it doesn't match the expected shape.`)
  return parsed.success ? parsed.data : undefined
}

/** How many documents a text search reads at a time; Firestore has no text search, so matching happens here. */
const SEARCH_BATCH = 30
const SEARCH_ROUNDS = 5

/**
 * One page of the Explore feed, newest first. `cursor` is the id of the last trip already shown. With a text query the
 * matching is done on this side, reading a few batches until the page fills.
 */
export async function listPublicPage(cursor: string | null, pageSize: number, filter: PublicFilter = {}): Promise<PublicPage> {
  const text = filter.q?.trim().toLowerCase()
  const matches = (t: PublicTrip) => !text || [t.title, t.description, t.ownerName].some((x) => (x ?? '').toLowerCase().includes(text))
  const batchSize = text ? SEARCH_BATCH : pageSize

  let after: DocumentSnapshot | undefined = cursor ? await getDoc(doc(getDb(), 'publicTrips', cursor)) : undefined
  if (after && !after.exists()) after = undefined
  const items: PublicTrip[] = []
  let lastSeen: DocumentSnapshot | undefined
  let hasMore = false

  for (let round = 0; round < SEARCH_ROUNDS && items.length < pageSize; round++) {
    const constraints: QueryConstraint[] = [where('visibility', '==', 'public')]
    if (filter.destinationId) constraints.push(where('destinationIds', 'array-contains', filter.destinationId))
    constraints.push(orderBy('publishedAt', 'desc'))
    if (after) constraints.push(startAfter(after))
    constraints.push(limit(batchSize + 1))

    const docs = (await getDocs(query(collection(getDb(), 'publicTrips'), ...constraints))).docs
    hasMore = docs.length > batchSize
    for (const d of docs.slice(0, batchSize)) {
      lastSeen = d
      const trip = asTrip(d)
      if (trip && matches(trip)) items.push(trip)
      if (items.length === pageSize) {
        hasMore = hasMore || docs.indexOf(d) < docs.length - 1
        break
      }
    }
    after = lastSeen
    if (!hasMore) break
  }
  return { items, nextCursor: hasMore && lastSeen ? lastSeen.id : null }
}

/** A published trip by its id, or undefined if it is gone. */
export async function getPublicTrip(id: string): Promise<PublicTrip | undefined> {
  const snap = await getDoc(doc(getDb(), 'publicTrips', id))
  return snap.exists() ? asTrip(snap) : undefined
}

/** A published trip by the slug in its URL (`/t/:slug`), through the short-link record. Works for unlisted pages too. */
export async function getPublicTripBySlug(slug: string): Promise<PublicTrip | undefined> {
  const link = await getDoc(doc(getDb(), 'publicSlugs', slug))
  if (!link.exists()) return undefined
  return getPublicTrip((link.data() as { publicTripId: string }).publicTripId)
}

/** Several published trips by id (a person's saved list); ones that no longer exist are left out. */
export async function getPublicTrips(ids: string[]): Promise<PublicTrip[]> {
  return (await Promise.all(ids.map((id) => getPublicTrip(id)))).filter((t): t is PublicTrip => !!t)
}

/** Destinations that have a listed itinerary, for the feed's filter chips (from the newest listings). */
export async function listPublicDestinationIds(): Promise<string[]> {
  const snap = await getDocs(query(collection(getDb(), 'publicTrips'), where('visibility', '==', 'public'), orderBy('publishedAt', 'desc'), limit(60)))
  return [...new Set(snap.docs.flatMap((d) => (d.data() as { destinationIds?: string[] }).destinationIds ?? []))]
}
