import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, increment, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { getActorId } from '../actor'
import { db } from '../db'
import type { SyncOp } from '../db'
import type { SyncResult } from '../syncEngine'
import { getDb } from '@/services/firebase/firestore'
import type { CollaboratorRole, User } from '@/types'
import { docPathFor, TRIP_CHILDREN, TRIP_MEDIA, USER_COLLECTIONS } from './paths'

/** How many times a write the rules refuse is retried before it is dropped. */
const REFUSED_RETRIES = 3
const REFUSED_GIVE_UP = 20

type Row = { id: string; updatedAt?: string } & Record<string, unknown>

const ref = (path: string) => doc(getDb(), path)
const withoutMembers = <T extends Record<string, unknown>>(row: T): Omit<T, 'members'> => {
  const { members: _members, ...rest } = row
  return rest
}

/** Removes a trip and everything under it. Children go first: the rules read the trip to decide who may delete them. */
async function deleteTripTree(tripId: string) {
  for (const name of [...TRIP_CHILDREN, TRIP_MEDIA]) {
    const snap = await getDocs(collection(getDb(), `trips/${tripId}/${name}`))
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(getDb())
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(ref(`trips/${tripId}`))
}

/** Keeps the trip's `members` map (which the security rules read) in step with its collaborators. */
async function syncMember(tripId: string, userId: string, role: CollaboratorRole | null) {
  await updateDoc(ref(`trips/${tripId}`), { [`members.${userId}`]: role ?? deleteField() })
}

/** Likes and saves of a published trip move a counter on it; the rules only allow both in one write. */
const COUNTERS: Record<string, string> = { likedTrips: 'likeCount', savedTrips: 'saveCount' }

async function sendCounted(op: SyncOp, target: ReturnType<typeof ref>): Promise<void> {
  const field = COUNTERS[op.entity]!
  const existing = await getDoc(target)

  if (op.op === 'put') {
    if (existing.exists()) return // already recorded
    const value = op.payload as { publicTripId?: string }
    const pubRef = value.publicTripId ? ref(`publicTrips/${value.publicTripId}`) : undefined
    if (!pubRef) return void (await setDoc(target, value)) // a note about one of your own trips: nothing to count
    if (!(await getDoc(pubRef)).exists()) return // unpublished in the meantime
    const batch = writeBatch(getDb())
    batch.set(target, value)
    batch.update(pubRef, { [field]: increment(1) })
    return batch.commit()
  }

  if (!existing.exists()) return
  const pubId = (existing.data() as { publicTripId?: string }).publicTripId
  const pubRef = pubId ? ref(`publicTrips/${pubId}`) : undefined
  if (!pubRef || !(await getDoc(pubRef)).exists()) return deleteDoc(target)
  const batch = writeBatch(getDb())
  batch.delete(target)
  batch.update(pubRef, { [field]: increment(-1) })
  return batch.commit()
}

/** Removes a published trip's photos, then the page itself (the rules read the page to decide who may delete them). */
async function deletePublicTree(pubId: string) {
  const snap = await getDocs(collection(getDb(), `publicTrips/${pubId}/media`))
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(getDb())
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(ref(`publicTrips/${pubId}`))
}

/** Copies the trip photos a published page shows (`public/{pubId}/{memoryId}`) to the page, once the page exists. */
async function copyPublicPhotos(pub: { id: string; snapshot: { memories: Array<{ id: string; mediaUrl: string }> } }) {
  const { copyToPublic } = await import('@/services/storage/firestoreMedia')
  for (const m of pub.snapshot.memories) {
    if (!m.mediaUrl.startsWith(`public/${pub.id}/`)) continue
    const mediaKey = (await db.memories.get(m.id))?.mediaKey
    if (mediaKey) await copyToPublic(mediaKey, pub.id, m.id)
  }
}

async function sendOne(op: SyncOp, uid: string): Promise<SyncResult> {
  const path = docPathFor(op, uid)
  if (!path) return { id: op.id!, status: 'ok' } // reference data or something that must not be written: drop it

  const target = ref(path)
  const tripId = (op.payload as { tripId?: string } | undefined)?.tripId

  if (COUNTERS[op.entity]) {
    await sendCounted(op, target)
    return { id: op.id!, status: 'ok' }
  }

  if (op.op === 'delete') {
    if (op.entity === 'trips') await deleteTripTree(op.entityId)
    else if (op.entity === 'publicTrips') await deletePublicTree(op.entityId)
    else {
      if (op.entity === 'collaborators' && tripId) {
        const existing = await getDoc(target)
        const userId = existing.data()?.userId as string | undefined
        if (userId) await syncMember(tripId, userId, null).catch(() => undefined)
      }
      await deleteDoc(target)
    }
    return { id: op.id!, status: 'ok' }
  }

  const value = op.payload as Row
  const remote = await getDoc(target)
  const remoteRow = remote.exists() ? ({ id: remote.id, ...remote.data() } as Row) : undefined

  // Newer write wins: if the server's copy was edited after ours, keep it and tell the caller.
  if (remoteRow?.updatedAt && value.updatedAt && remoteRow.updatedAt > value.updatedAt) {
    return { id: op.id!, status: 'conflict', current: withoutMembers(remoteRow) as Row }
  }

  if (op.entity === 'trips') {
    // `members` is created with the trip and afterwards changed only by collaborator edits, never by a trip write, so a
    // full replace keeps the stored map. (A full replace also clears fields the traveller emptied, which a merge would not.)
    const members = (remote.data()?.members as Record<string, string> | undefined) ?? { [value.ownerId as string]: 'owner' }
    await setDoc(target, { ...value, members })
  } else if (op.entity === 'publicTrips') {
    // Likes and saves come from other people, so a republish keeps the counts stored on the server.
    const stored = remote.data() as { likeCount?: number; saveCount?: number } | undefined
    await setDoc(target, { ...value, likeCount: stored?.likeCount ?? value.likeCount, saveCount: stored?.saveCount ?? value.saveCount })
    await copyPublicPhotos(value as unknown as Parameters<typeof copyPublicPhotos>[0])
  } else {
    await setDoc(target, value)
    if (op.entity === 'collaborators' && tripId) {
      const c = value as unknown as { userId: string; role: CollaboratorRole; status: string }
      await syncMember(tripId, c.userId, c.status === 'accepted' ? c.role : null)
    }
  }
  return { id: op.id!, status: 'ok' }
}

/**
 * Sends queued changes straight to Firestore, in order, as the signed-in person. The security rules decide whether each
 * one is allowed. Stops at the first failure and returns what succeeded; the sync engine keeps the rest queued.
 */
export async function sendBatchToFirestore(ops: SyncOp[]): Promise<SyncResult[]> {
  const uid = getActorId()
  if (!uid) throw new Error('Not signed in')
  const results: SyncResult[] = []
  let wrote = 0 // real writes that went through in this batch: proof the person can write at all
  for (const op of ops) {
    try {
      const result = await sendOne(op, uid)
      results.push(result)
      if (docPathFor(op, uid)) wrote++
    } catch (e) {
      // The rules said no. That may be permanent (a viewer editing) or a setup problem (rules not deployed yet), so retry a
      // few times before giving up on the change; dropping it at once could lose work to a misconfiguration.
      if ((e as { code?: string }).code === 'permission-denied') {
        const refusals = op.refusals ?? 0
        // Give up on a change only when the rules clearly object to *it*: others in this batch went through, or it has
        // been refused many times. If everything is refused, the likelier cause is setup (rules not deployed), so keep the
        // work and keep trying.
        if ((refusals >= REFUSED_RETRIES && wrote > 0) || refusals >= REFUSED_GIVE_UP) {
          results.push({ id: op.id!, status: 'ok' })
          console.warn(`Not allowed to sync ${op.entity}/${op.entityId}; dropped.`)
          continue
        }
        await db.syncQueue.update(op.id!, { refusals: refusals + 1 })
        console.warn(`Not allowed to sync ${op.entity}/${op.entityId} yet (refusal ${refusals + 1} of ${REFUSED_RETRIES + 1}).`)
      }
      if (results.length === 0) throw e
      break
    }
  }
  return results
}

// ---------------------------------------------------------------------------------------------------------------------
// Pull: bring the device up to date with what is stored remotely.
// ---------------------------------------------------------------------------------------------------------------------

const localTable = (name: string) => db.table(name) as { get(id: string): Promise<Row | undefined>; put(v: unknown): Promise<unknown>; where(k: string): { equals(v: unknown): { toArray(): Promise<Row[]> } }; bulkDelete(ids: string[]): Promise<unknown> }

/** Ids of things the device has changed but not yet sent: remote copies must never overwrite those. */
async function pendingIds(): Promise<Set<string>> {
  const ops = await db.syncQueue.toArray()
  return new Set(ops.map((o) => `${o.entity}/${o.entityId}`))
}

/** Take the remote copy when it is newer than ours (or we have none), unless we have an unsent edit to it. */
async function adopt(entity: string, remote: Row, pending: Set<string>): Promise<boolean> {
  if (pending.has(`${entity}/${remote.id}`)) return false
  const table = localTable(entity)
  const local = await table.get(remote.id)
  if (local && local.updatedAt && remote.updatedAt && local.updatedAt >= remote.updatedAt) return false
  if (local && !remote.updatedAt) return false // records without a timestamp are written once; keep what we have
  await table.put(entity === 'trips' ? withoutMembers(remote) : remote)
  return true
}

/** The signed-in person's profile as stored remotely, if any (used on a new device before one is created locally). */
export async function fetchRemoteProfile(uid: string): Promise<User | undefined> {
  const snap = await getDoc(ref(`users/${uid}`))
  return snap.exists() ? ({ id: uid, ...snap.data() } as User) : undefined
}

/**
 * Downloads the person's trips (and everything inside them), personal collections and profile. Returns how many local
 * records changed. A trip that disappeared remotely (deleted on another device, or access removed) is removed here too,
 * unless there are unsent local changes to it.
 */
export async function pullFromFirestore(uid: string): Promise<number> {
  const pending = await pendingIds()
  let changed = 0

  const tripSnap = await getDocs(query(collection(getDb(), 'trips'), where(`members.${uid}`, 'in', ['owner', 'editor', 'viewer'])))
  const remoteTripIds = new Set(tripSnap.docs.map((d) => d.id))

  for (const t of tripSnap.docs) {
    if (await adopt('trips', { id: t.id, ...t.data() } as Row, pending)) changed++
    for (const name of TRIP_CHILDREN) {
      const snap = await getDocs(collection(getDb(), `trips/${t.id}/${name}`))
      const remoteIds = new Set<string>()
      for (const d of snap.docs) {
        remoteIds.add(d.id)
        if (await adopt(name, { id: d.id, ...d.data() } as Row, pending)) changed++
      }
      const gone = (await localTable(name).where('tripId').equals(t.id).toArray()).filter((r) => !remoteIds.has(r.id) && !pending.has(`${name}/${r.id}`))
      if (gone.length) { await localTable(name).bulkDelete(gone.map((r) => r.id)); changed += gone.length }
    }
  }

  // Trips we hold for this person that the server no longer lists.
  const mine = await db.trips.toArray()
  for (const trip of mine) {
    const ours = trip.ownerId === uid || (await db.collaborators.where('[tripId+userId]').equals([trip.id, uid]).count()) > 0
    if (!ours || remoteTripIds.has(trip.id) || pending.has(`trips/${trip.id}`)) continue
    for (const name of TRIP_CHILDREN) {
      const rows = await localTable(name).where('tripId').equals(trip.id).toArray()
      await localTable(name).bulkDelete(rows.map((r) => r.id))
    }
    await db.trips.delete(trip.id)
    changed++
  }

  for (const name of USER_COLLECTIONS) {
    const snap = await getDocs(collection(getDb(), `users/${uid}/${name}`))
    for (const d of snap.docs) if (await adopt(name, { id: d.id, ...d.data() } as Row, pending)) changed++
  }

  const profile = await fetchRemoteProfile(uid)
  if (profile && (await adopt('users', profile as unknown as Row, pending))) changed++
  return changed
}
