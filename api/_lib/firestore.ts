/**
 * Reading a published trip from Firestore's public REST endpoint. No key is needed: the security rules let anyone open a
 * published page. Which Firebase project is read comes from the environment, so Preview and Production each serve
 * their own trips.
 */
const projectId = () => process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID

/** Overridable so tests can point at the emulator. */
export const firestoreBase = () =>
  process.env.FIRESTORE_REST_URL ?? `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`

export const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/

export interface PublishedPage {
  id: string
  doc: { fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }> }
}

/** The published page behind a short link, or undefined if there is none. */
export async function findPublishedPage(slug: string): Promise<PublishedPage | undefined> {
  if (!SLUG.test(slug)) return undefined
  const base = firestoreBase()
  const link = await fetch(`${base}/publicSlugs/${encodeURIComponent(slug)}`)
  if (!link.ok) return undefined
  const id = ((await link.json()) as { fields?: { publicTripId?: { stringValue?: string } } }).fields?.publicTripId?.stringValue
  if (!id) return undefined
  const page = await fetch(`${base}/publicTrips/${encodeURIComponent(id)}`)
  return page.ok ? { id, doc: await page.json() } : undefined
}
