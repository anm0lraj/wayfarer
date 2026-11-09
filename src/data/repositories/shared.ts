import type { Table } from 'dexie'
import { nanoid } from 'nanoid'
import { getActorId } from '../actor'
import { db } from '../db'
import { enqueue } from '../syncQueue'
import { can, PermissionError, type TripAction } from '@/lib/permissions'
import type { CollaboratorRole } from '@/types'

export const newId = (prefix: string) => `${prefix}_${nanoid(10)}`
export const nowIso = () => new Date().toISOString()

export function requireActor(): string {
  const id = getActorId()
  if (!id) throw new Error('Not signed in')
  return id
}

export async function getRole(tripId: string, userId: string | null = getActorId()): Promise<CollaboratorRole | null> {
  if (!userId) return null
  const trip = await db.trips.get(tripId)
  if (!trip) return null
  if (trip.ownerId === userId) return 'owner'
  const c = await db.collaborators.where('[tripId+userId]').equals([tripId, userId]).first()
  return c && c.status === 'accepted' ? c.role : null
}

/** Throws unless the signed-in user may perform `action` on the trip. */
export async function requireTripAccess(tripId: string, action: TripAction): Promise<void> {
  if (!(await db.trips.get(tripId))) throw new Error('Trip not found')
  if (!can(await getRole(tripId), action)) throw new PermissionError(action)
}

/**
 * Tables whose rows have no `updatedAt` set by their repository: `put` stamps it, so sync (adopt and conflicts, newer
 * wins) can compare copies. Rows written before this have none; any copy with a timestamp beats one without.
 */
const STAMPED = new Set(['days', 'checklist'])

/**
 * Writes an entity to the local table and queues the change for sync, in one transaction: a download applied meanwhile
 * (`applyRemote` in data/remote/firestoreSync.ts) sees either neither or both, so it can never overwrite the edit.
 */
export async function put<T extends { id: string }>(entity: string, table: Table<T, string>, value: NoInfer<T>) {
  if (STAMPED.has(entity)) value = { ...value, updatedAt: nowIso() }
  await db.transaction('rw', table, db.syncQueue, async () => {
    await table.put(value)
    await enqueue(entity, value.id, 'put', value)
  })
}

/** Deletes locally and queues the delete, in one transaction (as `put`), so a download can't bring the record back. */
export async function del<T>(entity: string, table: Table<T, string>, id: string) {
  await db.transaction('rw', table, db.syncQueue, async () => {
    // A delete has no document to read the owner from, so remember which trip it belonged to for the remote path.
    const tripId = ((await table.get(id)) as { tripId?: string } | undefined)?.tripId
    await table.delete(id)
    await enqueue(entity, id, 'delete', tripId ? { tripId } : undefined)
  })
}
