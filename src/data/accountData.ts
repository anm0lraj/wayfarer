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

const OWNER_KEY = 'accountUid'

/**
 * Records whose data this device holds. If a different account signs in (the previous one closed the tab, lost its
 * session, or was never signed out), the old account's data is removed first rather than shown to, or synced as, the new one.
 */
export async function claimDevice(uid: string): Promise<void> {
  const current = (await db.meta.get(OWNER_KEY))?.value
  if (current && current !== uid) await wipeLocalAccountData()
  if (current !== uid) await db.meta.put({ key: OWNER_KEY, value: uid })
}

/** Forget whose data this is (after the wipe on sign-out). */
export async function releaseDevice(): Promise<void> {
  await db.meta.delete(OWNER_KEY)
}
