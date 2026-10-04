import { db } from './db'

/**
 * What is stored on this device for the signed-in account, and how to remove it. Used when someone signs out, so the
 * next person to use the browser doesn't find the previous traveller's trips, memories or photos.
 *
 * The shared catalogue (destinations, places, hotels, flights) and `meta` belong to the app, not an account, so they stay.
 */
const ACCOUNT_TABLES = [
  'users', 'trips', 'days', 'items', 'bookings', 'memories', 'stories', 'publicTrips', 'savedTrips', 'savedPlaces', 'likedTrips',
  'checklist', 'notifications', 'aiConversations', 'aiMessages', 'collaborators', 'syncQueue', 'blobs',
] as const

export interface UnsentWork {
  /** Edits that have not reached the server. */
  changes: number
  /** Photos, videos and voice notes still waiting to upload. */
  uploads: number
}

/** Work that exists only on this device and would be lost by wiping it. */
export async function unsentWork(): Promise<UnsentWork> {
  const [changes, uploads] = await Promise.all([
    db.syncQueue.count(),
    db.memories.filter((m) => m.uploadState === 'queued' || m.uploadState === 'uploading' || m.uploadState === 'failed').count(),
  ])
  return { changes, uploads }
}

/** Removes every account-owned record from this device. */
export async function wipeLocalAccountData(): Promise<void> {
  const tables = ACCOUNT_TABLES.map((name) => db.table(name))
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
  })
}

/** Tables whose rows are exported (queued changes and photo bytes are not: they are plumbing and files, not records). */
const EXPORT_TABLES = ACCOUNT_TABLES.filter((t) => t !== 'syncQueue' && t !== 'blobs')

export interface DataExport { exportedAt: string; note: string; data: Record<string, unknown[]> }

/**
 * Everything this device holds for the signed-in account as plain JSON, for "Download my data". Because the device
 * keeps a full copy of the account's trips, this is the traveller's data. Photos and voice notes are referenced by key
 * (they are files); the shared catalogue of places is not personal data.
 */
export async function exportLocalAccountData(now = new Date()): Promise<DataExport> {
  const data: Record<string, unknown[]> = {}
  for (const name of EXPORT_TABLES) data[name] = await db.table(name).toArray()
  return { exportedAt: now.toISOString(), note: 'Your Wayfarer data as stored on this device. Photos and voice notes are files and are not included.', data }
}

const OWNER_KEY = 'accountUid'
/** Written only when the demo backend seeds its fake traveller and trips. A real account never writes it. */
const DEMO_SEED_KEY = 'seedVersion'

/**
 * Records whose data this device holds. If a different account signs in (the previous one closed the tab, lost its
 * session, or was never signed out), the old account's data is removed first rather than shown to, or synced as, the new one.
 *
 * The same goes for a browser that was used in demo mode (the site's earlier demo version, or a local demo run): its fake
 * traveller, trips and public pages have no owner on record, but they are not this person's, so they are cleared too.
 */
export async function claimDevice(uid: string): Promise<void> {
  const current = (await db.meta.get(OWNER_KEY))?.value
  const demoLeftovers = !current && !!(await db.meta.get(DEMO_SEED_KEY))
  if ((current && current !== uid) || demoLeftovers) await wipeLocalAccountData()
  if (demoLeftovers) await db.meta.delete(DEMO_SEED_KEY) // so this clean-up happens once
  if (current !== uid) await db.meta.put({ key: OWNER_KEY, value: uid })
}

/** Forget whose data this is (after the wipe on sign-out). */
export async function releaseDevice(): Promise<void> {
  await db.meta.delete(OWNER_KEY)
}
