import { db } from '../db'
import { del, newId, nowIso, put, requireActor } from './shared'
import { notificationSchema, userSchema } from '@/types'
import type { Notification, TripCollaborator, User } from '@/types'
import { requireTripAccess } from './shared'

export const userRepo = {
  get: (id: string): Promise<User | undefined> => db.users.get(id),

  async update(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    if (id !== requireActor()) throw new Error('You can only edit your own profile')
    const current = await db.users.get(id)
    if (!current) throw new Error('User not found')
    const next = userSchema.parse({ ...current, ...patch, updatedAt: nowIso() })
    await put('users', db.users, next)
    return next
  },
}

export const notificationRepo = {
  async list(): Promise<Notification[]> {
    const me = requireActor()
    return (await db.notifications.where('userId').equals(me).toArray()).sort((a, b) => b.scheduledFor.localeCompare(a.scheduledFor))
  },
  async add(input: Omit<Notification, 'id' | 'userId'>): Promise<Notification> {
    const n = notificationSchema.parse({ ...input, id: newId('ntf'), userId: requireActor() })
    await put('notifications', db.notifications, n)
    return n
  },
  async markRead(id: string): Promise<void> {
    const n = await db.notifications.get(id)
    if (n && !n.readAt) await put('notifications', db.notifications, { ...n, readAt: nowIso() })
  },
  async markAllRead(): Promise<void> {
    for (const n of await notificationRepo.list()) await notificationRepo.markRead(n.id)
  },
}

/** Mock-local collaboration. Roles are enforced by `requireTripAccess` everywhere else. */
export const collaboratorRepo = {
  async list(tripId: string): Promise<TripCollaborator[]> {
    await requireTripAccess(tripId, 'view')
    return db.collaborators.where('tripId').equals(tripId).toArray()
  },
  async invite(tripId: string, userId: string, role: 'editor' | 'viewer'): Promise<TripCollaborator> {
    await requireTripAccess(tripId, 'invite')
    const invitedBy = requireActor()
    const c: TripCollaborator = { id: newId('collab'), tripId, userId, role, status: 'invited', invitedBy, invitedAt: nowIso() }
    await put('collaborators', db.collaborators, c)
    return c
  },
  async setRole(id: string, role: 'editor' | 'viewer'): Promise<void> {
    const c = await db.collaborators.get(id)
    if (!c || c.role === 'owner') return
    await requireTripAccess(c.tripId, 'invite')
    await put('collaborators', db.collaborators, { ...c, role })
  },
  async remove(id: string): Promise<void> {
    const c = await db.collaborators.get(id)
    if (!c || c.role === 'owner') return
    await requireTripAccess(c.tripId, 'invite')
    await del('collaborators', db.collaborators, id)
  },
}
