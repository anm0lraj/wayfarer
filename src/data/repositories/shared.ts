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

/** Writes an entity to the local table and queues the change for sync. */
export async function put<T extends { id: string }>(entity: string, table: { put(v: T): Promise<unknown> }, value: T) {
  await table.put(value)
  await enqueue(entity, value.id, 'put', value)
}

export async function del(entity: string, table: { get(id: string): Promise<unknown>; delete(id: string): Promise<unknown> }, id: string) {
  // A delete has no document to read the owner from, so remember which trip it belonged to for the remote path.
  const tripId = ((await table.get(id)) as { tripId?: string } | undefined)?.tripId
  await table.delete(id)
  await enqueue(entity, id, 'delete', tripId ? { tripId } : undefined)
}
