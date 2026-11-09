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

  /** Appends to the day, or inserts at `atIndex` (clamped) and shifts the stops after it down. */
  async addItem(tripId: string, dayId: string, input: NewItemInput & Partial<Pick<ItineraryItem, 'source' | 'image' | 'notes' | 'autoPhoto'>>, atIndex?: number): Promise<ItineraryItem> {
    await requireTripAccess(tripId, 'edit')
    const existing = await dayItems(dayId)
    const index = atIndex === undefined ? existing.length : Math.max(0, Math.min(Math.floor(atIndex), existing.length))
    const now = nowIso()
    const item = itineraryItemSchema.parse({
      source: 'user', ...input, id: newId('item'), tripId, dayId, position: index, status: 'upcoming', createdAt: now, updatedAt: now,
    })
    await put('items', db.items, item)
    if (index < existing.length) await writeOrder([...existing.slice(0, index), item, ...existing.slice(index)])
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

  /**
   * Move to `toIndex` within `toDayId` (same or different day). One transaction: both days' new orders, the moved item and
   * both days' travel legs are written (and queued for sync) together, or nothing is, so a failure part-way can't leave
   * two stops sharing a position or a day measured against a stop that has left it.
   */
  async moveItem(id: string, toDayId: string, toIndex: number): Promise<void> {
    const current = await db.items.get(id)
    if (!current) throw new Error('Activity not found')
    await requireTripAccess(current.tripId, 'edit')
    const target = await db.days.get(toDayId)
    if (!target || target.tripId !== current.tripId) throw new Error('Day not found in this trip')
    await db.transaction('rw', db.tables, async () => {
      const item = (await db.items.get(id)) ?? current
      const moved = { ...item, dayId: toDayId, updatedAt: nowIso() }
      const list = (await dayItems(toDayId)).filter((i) => i.id !== id)
      list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, moved)
      await put('items', db.items, moved)
      if (item.dayId !== toDayId) await writeOrder((await dayItems(item.dayId)).filter((i) => i.id !== id))
      await writeOrder(list)
      await refreshLegs(toDayId)
      if (item.dayId !== toDayId) await refreshLegs(item.dayId)
    })
  },

  async reorder(dayId: string, itemIds: string[]): Promise<void> {
    const items = await dayItems(dayId)
    if (!items.length) return
    await requireTripAccess(items[0]!.tripId, 'edit')
    const byId = new Map(items.map((i) => [i.id, i]))
    const ordered = itemIds.map((id) => byId.get(id)).filter((i): i is ItineraryItem => !!i)
    const rest = items.filter((i) => !itemIds.includes(i.id))
    // One transaction: a reorder rewrites several rows, and if the page is closed or reloaded part-way the day must
    // end up in the old order or the new one — never with two items sharing a position.
    await db.transaction('rw', db.tables, async () => {
      await writeOrder([...ordered, ...rest])
      await refreshLegs(dayId)
    })
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

  /**
   * Puts days back exactly as they were in `before` (from `listDays`/`listItems` of the trip): their titles and notes,
   * and their items with the same content and order; items added to those days since are removed. One transaction.
   * Rewritten rows get a fresh `updatedAt` so sync treats the Undo as the newest edit.
   */
  async restorePlan(tripId: string, before: { days: ItineraryDay[]; items: ItineraryItem[] }): Promise<void> {
    await requireTripAccess(tripId, 'edit')
    const content = (o: object) => JSON.stringify(Object.entries(o).filter(([k, v]) => k !== 'updatedAt' && v !== undefined).sort(([a], [b]) => a.localeCompare(b)))
    const same = (a: object | undefined, b: object) => !!a && content(a) === content(b)
    await db.transaction('rw', db.tables, async () => {
      const keep = new Set(before.items.map((i) => i.id))
      for (const day of before.days) {
        if (day.tripId !== tripId) continue
        for (const item of await dayItems(day.id)) if (!keep.has(item.id)) await del('items', db.items, item.id)
        if (!same(await db.days.get(day.id), day)) await put('days', db.days, day)
      }
      for (const item of before.items) {
        if (item.tripId === tripId && !same(await db.items.get(item.id), item)) await put('items', db.items, { ...item, updatedAt: nowIso() })
      }
    })
  },

  async updateDay(id: string, patch: Partial<Pick<ItineraryDay, 'title' | 'notes' | 'destinationId'>>): Promise<void> {
    const day = await db.days.get(id)
    if (!day) throw new Error('Day not found')
    await requireTripAccess(day.tripId, 'edit')
    await put('days', db.days, { ...day, ...patch })
  },
}
