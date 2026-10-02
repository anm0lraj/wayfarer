import {
  collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { getActorId } from '../actor'
import { db } from '../db'
import type { SyncOp } from '../db'
import type { SyncResult } from '../syncEngine'
import { getDb } from '@/services/firebase/firestore'
import type { CollaboratorRole, User } from '@/types'
import { docPathFor, TRIP_CHILDREN, USER_COLLECTIONS } from './paths'

type Row = { id: string; updatedAt?: string } & Record<string, unknown>

const ref = (path: string) => doc(getDb(), path)
const withoutMembers = <T extends Record<string, unknown>>(row: T): Omit<T, 'members'> => {
  const { members: _members, ...rest } = row
  return rest
}

/** Removes a trip and everything under it. Children go first: the rules read the trip to decide who may delete them. */
async function deleteTripTree(tripId: string) {
  for (const name of TRIP_CHILDREN) {
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

async function sendOne(op: SyncOp, uid: string): Promise<SyncResult> {
  const path = docPathFor(op, uid)
  if (!path) return { id: op.id!, status: 'ok' } // reference data or something that must not be written: drop it

  const target = ref(path)
  const tripId = (op.payload as { tripId?: string } | undefined)?.tripId

  if (op.op === 'delete') {
    if (op.entity === 'trips') await deleteTripTree(op.entityId)
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
  for (const op of ops) {
    try {
      results.push(await sendOne(op, uid))
    } catch (e) {
      // A rejected write will never succeed on retry (the rules said no). Drop it so it can't block everything behind it.
      if ((e as { code?: string }).code === 'permission-denied') {
        results.push({ id: op.id!, status: 'ok' })
        console.warn(`Not allowed to sync ${op.entity}/${op.entityId}; dropped.`)
        continue
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
