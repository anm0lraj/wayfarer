import { db } from '../db'
import { del, newId, put, requireTripAccess } from './shared'
import { checklistItemSchema } from '@/types'
import type { ChecklistItem } from '@/types'

/** Auto items resolve from bookings; custom items use their stored `done` flag. */
export async function resolveChecklist(tripId: string): Promise<ChecklistItem[]> {
  const [items, bookings] = await Promise.all([
    db.checklist.where('tripId').equals(tripId).toArray(),
    db.bookings.where('tripId').equals(tripId).toArray(),
  ])
  const has = (type: string) => bookings.some((b) => b.type === type && b.status !== 'cancelled')
  const auto: Record<string, boolean> = { flight_booked: has('flight'), hotel_booked: has('hotel'), activities_booked: has('activity') }
  return items.map((i) => (i.autoRule ? { ...i, done: auto[i.autoRule] ?? false } : i))
}

export const checklistRepo = {
  async list(tripId: string): Promise<ChecklistItem[]> {
    await requireTripAccess(tripId, 'view')
    return resolveChecklist(tripId)
  },

  async toggle(id: string): Promise<void> {
    const item = await db.checklist.get(id)
    if (!item) return
    await requireTripAccess(item.tripId, 'edit')
    if (item.autoRule) return // derived from bookings
    await put('checklist', db.checklist, { ...item, done: !item.done })
  },

  async addCustom(tripId: string, label: string): Promise<ChecklistItem> {
    await requireTripAccess(tripId, 'edit')
    const item = checklistItemSchema.parse({ id: newId('chk'), tripId, label: label.trim(), type: 'custom', done: false })
    await put('checklist', db.checklist, item)
    return item
  },

  async remove(id: string): Promise<void> {
    const item = await db.checklist.get(id)
    if (!item) return
    await requireTripAccess(item.tripId, 'edit')
    await del('checklist', db.checklist, id)
  },
}
