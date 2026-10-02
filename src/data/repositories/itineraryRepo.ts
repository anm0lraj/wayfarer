import { db } from '../db'
import { del, newId, nowIso, put, requireTripAccess } from './shared'
import { estimateTravelMinutes, haversineKm } from '@/lib/geo'
import { retime } from '@/features/itinerary/schedule'
import { itineraryItemSchema } from '@/types'
import type { GeoPoint, ItineraryDay, ItineraryItem, NewItemInput } from '@/types'

async function dayItems(dayId: string): Promise<ItineraryItem[]> {
  return (await db.items.where('dayId').equals(dayId).toArray()).sort((a, b) => a.position - b.position)
}

/** Rewrite positions as 0..n-1 in the order given. */
async function writeOrder(items: ItineraryItem[]) {
  for (const [i, item] of items.entries()) {
    if (item.position !== i) await put('items', db.items, { ...item, position: i, updatedAt: nowIso() })
  }
}

async function locationOf(item: ItineraryItem): Promise<GeoPoint | undefined> {
  if (item.customLocation) return item.customLocation.point
  return item.placeId ? (await db.places.get(item.placeId))?.location : undefined
}

/**
 * Recomputes distance and travel time between consecutive stops of a day. Stops without a location are
 * skipped (the next stop measures from the last stop that has one). Called after every change to a day.
 */
async function refreshLegs(dayId: string) {
  let prev: GeoPoint | undefined
  for (const item of await dayItems(dayId)) {
    const point = await locationOf(item)
    let distanceFromPrevKm: number | undefined
    let travelTimeFromPrevMin: number | undefined
    if (prev && point) {
      distanceFromPrevKm = Math.round(haversineKm(prev, point) * 10) / 10
      travelTimeFromPrevMin = estimateTravelMinutes(distanceFromPrevKm)
    }
    if (item.distanceFromPrevKm !== distanceFromPrevKm || item.travelTimeFromPrevMin !== travelTimeFromPrevMin) {
      await put('items', db.items, { ...item, distanceFromPrevKm, travelTimeFromPrevMin })
    }
    if (point) prev = point
  }
}

async function promoteFromDraft(tripId: string) {
  const trip = await db.trips.get(tripId)
  if (trip?.state === 'draft') await put('trips', db.trips, { ...trip, state: 'planning', updatedAt: nowIso() })
}

export interface DaySnapshot {
  dayId: string
  removed: ItineraryItem[]
  addedIds: string[]
}

export const itineraryRepo = {
  async listDays(tripId: string): Promise<ItineraryDay[]> {
    await requireTripAccess(tripId, 'view')
    return (await db.days.where('tripId').equals(tripId).toArray()).sort((a, b) => a.dayNumber - b.dayNumber)
  },

  /** All items for a trip ordered by day then position. */
  async listItems(tripId: string): Promise<ItineraryItem[]> {
    await requireTripAccess(tripId, 'view')
    const days = await db.days.where('tripId').equals(tripId).toArray()
    const order = new Map(days.map((d) => [d.id, d.dayNumber]))
    return (await db.items.where('tripId').equals(tripId).toArray()).sort(
      (a, b) => (order.get(a.dayId) ?? 0) - (order.get(b.dayId) ?? 0) || a.position - b.position,
    )
  },

  async addItem(tripId: string, dayId: string, input: NewItemInput & Partial<Pick<ItineraryItem, 'source' | 'image' | 'notes'>>): Promise<ItineraryItem> {
    await requireTripAccess(tripId, 'edit')
    const existing = await dayItems(dayId)
    const now = nowIso()
    const item = itineraryItemSchema.parse({
      source: 'user', ...input, id: newId('item'), tripId, dayId, position: existing.length, status: 'upcoming', createdAt: now, updatedAt: now,
    })
    await put('items', db.items, item)
    await refreshLegs(dayId)
    await promoteFromDraft(tripId)
    return (await db.items.get(item.id)) ?? item
  },

  async updateItem(id: string, patch: Partial<Omit<ItineraryItem, 'id' | 'tripId' | 'createdAt'>>): Promise<ItineraryItem> {
    const current = await db.items.get(id)
    if (!current) throw new Error('Activity not found')
    await requireTripAccess(current.tripId, 'edit')
    const next = itineraryItemSchema.parse({ ...current, ...patch, updatedAt: nowIso() })
    await put('items', db.items, next)
    if ('customLocation' in patch || 'placeId' in patch) await refreshLegs(current.dayId)
    return (await db.items.get(id)) ?? next
  },

  /** Returns the removed item so the caller can offer Undo via `restoreItem`. */
  async removeItem(id: string): Promise<ItineraryItem> {
    const current = await db.items.get(id)
    if (!current) throw new Error('Activity not found')
    await requireTripAccess(current.tripId, 'edit')
    await del('items', db.items, id)
    await writeOrder(await dayItems(current.dayId))
    await refreshLegs(current.dayId)
    return current
  },

  async restoreItem(item: ItineraryItem): Promise<void> {
    await requireTripAccess(item.tripId, 'edit')
    const items = await dayItems(item.dayId)
    items.splice(Math.min(item.position, items.length), 0, item)
    await put('items', db.items, item)
    await writeOrder(items)
    await refreshLegs(item.dayId)
  },

  async duplicateItem(id: string): Promise<ItineraryItem> {
    const current = await db.items.get(id)
    if (!current) throw new Error('Activity not found')
    await requireTripAccess(current.tripId, 'edit')
    const now = nowIso()
    const copy = { ...current, id: newId('item'), title: `${current.title} (copy)`, bookingId: undefined, status: 'upcoming' as const, position: current.position + 1, createdAt: now, updatedAt: now }
    const items = await dayItems(current.dayId)
    items.splice(current.position + 1, 0, copy)
    await put('items', db.items, copy)
    await writeOrder(items)
    await refreshLegs(current.dayId)
    return copy
  },

  /** Move to `toIndex` within `toDayId` (same or different day). */
  async moveItem(id: string, toDayId: string, toIndex: number): Promise<void> {
    const current = await db.items.get(id)
    if (!current) throw new Error('Activity not found')
    await requireTripAccess(current.tripId, 'edit')
    const target = await db.days.get(toDayId)
    if (!target || target.tripId !== current.tripId) throw new Error('Day not found in this trip')
    if (current.dayId !== toDayId) await writeOrder((await dayItems(current.dayId)).filter((i) => i.id !== id))
    const list = (await dayItems(toDayId)).filter((i) => i.id !== id)
    list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, { ...current, dayId: toDayId })
    await put('items', db.items, { ...current, dayId: toDayId, updatedAt: nowIso() })
    await writeOrder(list)
    await refreshLegs(toDayId)
    if (current.dayId !== toDayId) await refreshLegs(current.dayId)
  },

  async reorder(dayId: string, itemIds: string[]): Promise<void> {
    const items = await dayItems(dayId)
    if (!items.length) return
    await requireTripAccess(items[0]!.tripId, 'edit')
    const byId = new Map(items.map((i) => [i.id, i]))
    const ordered = itemIds.map((id) => byId.get(id)).filter((i): i is ItineraryItem => !!i)
    const rest = items.filter((i) => !itemIds.includes(i.id))
    await writeOrder([...ordered, ...rest])
    await refreshLegs(dayId)
  },

  /** Makes a day realistic by spacing stops with their travel time. Returns the previous times for Undo. */
  async retimeDay(dayId: string): Promise<Array<{ id: string; startTime: string }>> {
    const items = await dayItems(dayId)
    if (!items.length) return []
    await requireTripAccess(items[0]!.tripId, 'edit')
    const previous = items.map((i) => ({ id: i.id, startTime: i.startTime }))
    await itineraryRepo.setTimes(retime(items))
    return previous
  },

  async setTimes(times: Array<{ id: string; startTime: string }>): Promise<void> {
    for (const t of times) {
      const item = await db.items.get(t.id)
      if (item && item.startTime !== t.startTime) {
        await requireTripAccess(item.tripId, 'edit')
        await put('items', db.items, { ...item, startTime: t.startTime, updatedAt: nowIso() })
      }
    }
  },

  /** Swaps a day's contents for new items (used after previewing a regenerated day). Returns what Undo needs. */
  async replaceDayItems(dayId: string, inputs: NewItemInput[]): Promise<DaySnapshot> {
    const day = await db.days.get(dayId)
    if (!day) throw new Error('Day not found')
    await requireTripAccess(day.tripId, 'edit')
    const removed = await dayItems(dayId)
    for (const r of removed) await del('items', db.items, r.id)
    const addedIds: string[] = []
    for (const input of inputs) addedIds.push((await itineraryRepo.addItem(day.tripId, dayId, { ...input, source: 'ai' })).id)
    return { dayId, removed, addedIds }
  },

  async restoreDay(snapshot: DaySnapshot): Promise<void> {
    for (const id of snapshot.addedIds) if (await db.items.get(id)) await del('items', db.items, id)
    for (const item of snapshot.removed) await put('items', db.items, item)
    await refreshLegs(snapshot.dayId)
  },

  async updateDay(id: string, patch: Partial<Pick<ItineraryDay, 'title' | 'notes' | 'destinationId'>>): Promise<void> {
    const day = await db.days.get(id)
    if (!day) throw new Error('Day not found')
    await requireTripAccess(day.tripId, 'edit')
    await put('days', db.days, { ...day, ...patch })
  },
}
