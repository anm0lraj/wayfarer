import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { DEMO_USER_ID, setActorId } from '../actor'
import { resetDemoData, seedIfNeeded } from '../seed'
import { buildSeed } from '../seedData'
import { bookingRepo, checklistRepo, itineraryRepo, publicTripRepo, tripRepo, applyAIAction, collaboratorRepo } from './index'
import { pendingCount } from '../syncQueue'
import { PermissionError } from '@/lib/permissions'

beforeEach(async () => {
  setActorId(DEMO_USER_ID)
  await resetDemoData()
})

describe('seed data', () => {
  it('validates against schemas and contains the Bali demo trip', async () => {
    const s = buildSeed()
    expect(s.trips.find((t) => t.id === 'trip-bali')).toMatchObject({ title: '5 Days in Bali', startDate: '2026-10-12', endDate: '2026-10-16', travellers: { count: 2 }, budget: { total: { amount: 60000 } } })
    expect(s.publicTrips.length).toBeGreaterThanOrEqual(3)
    expect(s.days.filter((d) => d.tripId === 'trip-bali')).toHaveLength(5)
  })
  it('is idempotent', async () => {
    expect(await seedIfNeeded()).toBe(false)
  })
})

describe('itinerary repository', () => {
  it('reorders, moves between days, deletes with undo, duplicates', async () => {
    const day1 = (await itineraryRepo.listItems('trip-bali')).filter((i) => i.dayId === 'day-1')
    await itineraryRepo.moveItem(day1[0]!.id, 'day-2', 0)
    const afterMove = (await itineraryRepo.listItems('trip-bali')).filter((i) => i.dayId === 'day-2')
    expect(afterMove[0]!.id).toBe(day1[0]!.id)
    expect(afterMove.map((i) => i.position)).toEqual(afterMove.map((_, i) => i))

    const removed = await itineraryRepo.removeItem(afterMove[0]!.id)
    expect((await db.items.get(removed.id))).toBeUndefined()
    await itineraryRepo.restoreItem(removed)
    expect((await db.items.get(removed.id))?.position).toBe(0)

    const copy = await itineraryRepo.duplicateItem(removed.id)
    expect(copy.position).toBe(1)
  })
  it('queues changes for sync', async () => {
    const before = await pendingCount()
    await itineraryRepo.updateItem('item-d1-1', { notes: 'Pre-arranged pickup' })
    expect(await pendingCount()).toBe(before + 1)
  })
})

describe('bookings stay demo', () => {
  it('saves as demo/saved and resolves checklist automatically', async () => {
    const b = await bookingRepo.saveDemo({ tripId: 'trip-bali', type: 'hotel', provider: 'Demo', title: 'Seminyak Garden Villas', price: { amount: 26000, currency: 'INR' }, startAt: '2026-10-12T14:00:00+08:00' })
    expect(b).toMatchObject({ mode: 'demo', status: 'saved' })
    const hotel = (await checklistRepo.list('trip-bali')).find((c) => c.autoRule === 'hotel_booked')
    expect(hotel?.done).toBe(true)
  })
})

describe('permissions', () => {
  it('blocks viewers from editing and non-members from viewing', async () => {
    await db.users.put({ ...(await db.users.get(DEMO_USER_ID))!, id: 'user-viewer', name: 'Viewer' })
    await db.collaborators.put({ id: 'c-v', tripId: 'trip-bali', userId: 'user-viewer', role: 'viewer', status: 'accepted', invitedBy: DEMO_USER_ID, invitedAt: new Date().toISOString() })
    setActorId('user-viewer')
    await expect(tripRepo.get('trip-bali')).resolves.toBeDefined()
    await expect(itineraryRepo.updateItem('item-d1-1', { notes: 'x' })).rejects.toBeInstanceOf(PermissionError)
    setActorId('user-stranger')
    await expect(tripRepo.get('trip-bali')).rejects.toBeInstanceOf(PermissionError)
  })
  it('only owners can invite', async () => {
    const c = await collaboratorRepo.invite('trip-bali', 'user-friend', 'editor')
    expect(c.status).toBe('invited')
  })
})

describe('AI actions go through repositories', () => {
  it('validates, applies and undoes', async () => {
    const res = await applyAIAction('trip-bali', { type: 'ADD_ACTIVITY', dayNumber: 3, item: { title: 'Sunset viewpoint', startTime: '17:00', durationMin: 60, category: 'sunset' } })
    expect((await itineraryRepo.listItems('trip-bali')).some((i) => i.title === 'Sunset viewpoint' && i.source === 'ai')).toBe(true)
    await res.undo()
    expect((await itineraryRepo.listItems('trip-bali')).some((i) => i.title === 'Sunset viewpoint')).toBe(false)
  })
  it('rejects malformed model output', async () => {
    await expect(applyAIAction('trip-bali', { type: 'DROP_TABLE' })).rejects.toThrow()
    await expect(applyAIAction('trip-bali', { type: 'MOVE_ACTIVITY', itemId: 'x', toDayNumber: 0, position: 0 })).rejects.toThrow()
  })
})

describe('trips & public trips', () => {
  it('creates a trip with days and checklist; archive and restore follow the state machine', async () => {
    const t = await tripRepo.create({ title: 'Jaipur', destinationIds: ['jaipur'], startDate: '2026-12-01', endDate: '2026-12-03', timezone: 'Asia/Kolkata', travellers: { group: 'solo', count: 1 }, budget: { tier: 'economy' }, interests: ['culture'], planningStyle: 'manual' })
    expect(t.state).toBe('draft')
    expect(await itineraryRepo.listDays(t.id)).toHaveLength(3)
    await expect(tripRepo.transition(t.id, 'ready')).rejects.toThrow()
    await tripRepo.transition(t.id, 'archived')
    expect((await tripRepo.transition(t.id, 'planning')).state).toBe('planning')
  })
  it('publishes a sanitised snapshot and copies a public itinerary without touching the original', async () => {
    await itineraryRepo.updateItem('item-d1-1', { notes: 'PRIVATE: villa gate code 4821' })
    const pub = await publicTripRepo.publish('trip-bali', { description: 'Test', visibility: 'public' })
    expect(JSON.stringify(pub)).not.toContain('4821')
    const copy = await publicTripRepo.useItinerary(pub.id, { startDate: '2027-01-10', endDate: '2027-01-14' })
    expect(copy.copiedFromPublicTripId).toBe(pub.id)
    expect((await itineraryRepo.listItems(copy.id)).length).toBe(pub.snapshot.items.length)
    expect((await db.publicTrips.get(pub.id))?.title).toBe(pub.title)
  })
  it('deleting a trip cascades', async () => {
    await tripRepo.remove('trip-goa')
    expect(await db.items.where('tripId').equals('trip-goa').count()).toBe(0)
    expect(await db.memories.where('tripId').equals('trip-goa').count()).toBe(0)
  })
})
