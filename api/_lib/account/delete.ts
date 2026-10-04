import { accessToken } from '../admin/google.js'
import { addToNumber, deletePaths, getDocument, listCollection, listPaths, pathsWhere, removeMapEntry, tripsOf } from '../admin/store.js'

/** Everything inside a trip. (`media` holds the photos and voice notes.) */
const TRIP_PARTS = ['days', 'items', 'bookings', 'checklist', 'memories', 'stories', 'collaborators', 'media'] as const
/** Private collections under `users/{uid}`. */
const USER_PARTS = ['savedPlaces', 'notifications', 'aiConversations', 'aiMessages', 'usage', 'devices', 'pushLog', 'savedTrips', 'likedTrips'] as const

export interface DeletionReport { ownedTrips: number; leftTrips: number; publishedPages: number; documents: number }

const identityBase = () => process.env.IDENTITY_TOOLKIT_URL ?? 'https://identitytoolkit.googleapis.com'
const projectId = () => process.env.VITE_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID

/** Removes a published page: its photos, the page, and every short link that points to it. */
async function deletePublicPage(path: string): Promise<number> {
  const id = path.split('/')[1]!
  const parts = [...(await listPaths(`publicTrips/${id}/media`)), ...(await pathsWhere('publicSlugs', 'publicTripId', id)), path]
  await deletePaths(parts)
  return parts.length
}

/**
 * Deletes what belongs to one person, as an administrator (the security rules would not let anyone remove all of this
 * from another account, and rightly). The order puts the account's own data last, so a failure part-way can simply be
 * run again: every step ignores what is already gone.
 *
 *   - trips they own, with everything inside them (days, items, bookings, memories, photos, collaborators)
 *   - trips shared with them: they are taken off the trip, the trip stays for the others
 *   - pages they published (with photos and links), and their likes and saves (the page counters go back down)
 *   - their profile, settings, notifications, assistant chats and registered devices
 *   - invitations they sent, ones sent to their verified email, and the feedback they left
 */
export async function deleteAccountData(uid: string, email?: string): Promise<DeletionReport> {
  const report: DeletionReport = { ownedTrips: 0, leftTrips: 0, publishedPages: 0, documents: 0 }
  const remove = async (paths: string[]) => { await deletePaths(paths); report.documents += paths.length }

  const owned = await pathsWhere('trips', 'ownerId', uid)
  for (const trip of owned) {
    const id = trip.split('/')[1]!
    for (const part of TRIP_PARTS) await remove(await listPaths(`trips/${id}/${part}`))
    await remove([...(await pathsWhere('invites', 'tripId', id)), trip])
    report.ownedTrips++
  }

  const ownedIds = new Set(owned.map((p) => p.split('/')[1]))
  for (const t of await tripsOf(uid)) {
    if (ownedIds.has(t.id)) continue
    await removeMapEntry(`trips/${t.id}`, 'members', uid)
    await remove([`trips/${t.id}/collaborators/collab_${uid}`])
    report.leftTrips++
  }

  for (const page of await pathsWhere('publicTrips', 'ownerId', uid)) {
    report.documents += await deletePublicPage(page)
    report.publishedPages++
  }
  await remove(await pathsWhere('publicSlugs', 'ownerId', uid)) // links left over from a page that is already gone

  // A like or save counts on someone's page; give the count back before removing the record of it.
  for (const [collection, counter] of [['likedTrips', 'likeCount'], ['savedTrips', 'saveCount']] as const) {
    for (const d of await listCollection(`users/${uid}/${collection}`)) {
      const page = typeof d.data.publicTripId === 'string' ? d.data.publicTripId : undefined
      if (page) await addToNumber(`publicTrips/${page}`, counter, -1)
    }
  }
  for (const part of USER_PARTS) await remove(await listPaths(`users/${uid}/${part}`))

  await remove(await pathsWhere('feedback', 'uid', uid))
  await remove(await pathsWhere('invites', 'invitedBy', uid))
  if (email) await remove(await pathsWhere('invites', 'email', email))
  if (await getDocument(`users/${uid}`)) await remove([`users/${uid}`])
  return report
}

/** Deletes the sign-in itself (Firebase Authentication), so the same Google account starts again with nothing. */
export async function deleteAuthAccount(uid: string): Promise<void> {
  const res = await fetch(`${identityBase()}/v1/projects/${encodeURIComponent(projectId() ?? '')}/accounts:delete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify({ localId: uid }),
  })
  // 400 USER_NOT_FOUND: already deleted by an earlier attempt.
  if (!res.ok && res.status !== 400) throw new Error(`Could not delete the sign-in (${res.status})`)
}
