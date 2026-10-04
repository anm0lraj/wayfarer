import { beforeEach, describe, expect, it } from 'vitest'
import { claimDevice, exportLocalAccountData, releaseDevice, unsentWork, wipeLocalAccountData } from './accountData'
import { db } from './db'
import { resetDemoData } from './seed'
import { settle } from '@/test/settle'

beforeEach(async () => {
  await settle()
  await resetDemoData() // trips, memories, notifications… plus the catalogue (destinations, places, hotels, flights)
  await db.meta.delete('accountUid')
})

describe('wiping an account from the device', () => {
  it('removes trips, memories, profile, queued changes and stored media, but keeps the shared catalogue', async () => {
    await db.blobs.put({ key: 'media/1', blob: new Blob(['x']), createdAt: 1 })
    await db.syncQueue.add({ entity: 'trips', entityId: 't', op: 'put', createdAt: 1, attempts: 0 })
    expect(await db.trips.count()).toBeGreaterThan(0)
    const catalogue = { destinations: await db.destinations.count(), places: await db.places.count(), hotels: await db.hotels.count(), flights: await db.flights.count() }

    await wipeLocalAccountData()

    for (const t of ['users', 'trips', 'days', 'items', 'bookings', 'memories', 'stories', 'publicTrips', 'notifications', 'aiConversations', 'collaborators', 'syncQueue', 'blobs']) {
      expect(await db.table(t).count(), t).toBe(0)
    }
    expect({ destinations: await db.destinations.count(), places: await db.places.count(), hotels: await db.hotels.count(), flights: await db.flights.count() }).toEqual(catalogue)
    expect((await db.meta.get('seedVersion'))?.value).toBeDefined()
  })
})

describe('a browser that was used in demo mode', () => {
  it('has its demo traveller, trips and public pages cleared when a real account signs in, once', async () => {
    // beforeEach left exactly that: the demo seed (with its marker) and no owner on record.
    expect(await db.meta.get('seedVersion')).toBeDefined()
    expect(await db.trips.count()).toBeGreaterThan(0)
    expect(await db.publicTrips.count()).toBeGreaterThan(0)
    const catalogue = await db.places.count()

    await claimDevice('uid-real')

    expect(await db.trips.count()).toBe(0)
    expect(await db.items.count()).toBe(0)
    expect(await db.publicTrips.count()).toBe(0)
    expect(await db.users.count()).toBe(0)
    expect(await db.places.count()).toBe(catalogue) // the shared catalogue stays
    expect(await db.meta.get('seedVersion')).toBeUndefined()
    expect((await db.meta.get('accountUid'))?.value).toBe('uid-real')

    // The next sign-in must not wipe what the real account has stored since.
    await db.trips.put({ id: 't-real', ownerId: 'uid-real', title: 'Mine' } as never)
    await claimDevice('uid-real')
    expect(await db.trips.get('t-real')).toBeDefined()
  })
})

describe('exporting an account’s data', () => {
  it('has the traveller’s records as plain JSON, without queued changes, photo bytes or the shared catalogue', async () => {
    await db.blobs.put({ key: 'media/1', blob: new Blob(['x']), createdAt: 1 })
    await db.syncQueue.add({ entity: 'trips', entityId: 't', op: 'put', createdAt: 1, attempts: 0 })
    const out = await exportLocalAccountData(new Date('2026-10-05T00:00:00Z'))
    expect(out.exportedAt).toBe('2026-10-05T00:00:00.000Z')
    expect(out.data.trips!.length).toBe(await db.trips.count())
    expect(out.data.items!.length).toBeGreaterThan(0)
    expect(Object.keys(out.data)).not.toEqual(expect.arrayContaining(['syncQueue']))
    for (const t of ['blobs', 'syncQueue', 'destinations', 'places', 'hotels', 'flights']) expect(out.data, t).not.toHaveProperty(t)
    expect(() => JSON.stringify(out)).not.toThrow()
  })
})

describe('work that would be lost', () => {
  it('counts unsent edits and uploads that have not finished', async () => {
    await db.syncQueue.clear()
    expect(await unsentWork()).toEqual({ changes: 0, uploads: expect.any(Number) })
    await db.memories.toCollection().modify({ uploadState: 'done' })
    expect(await unsentWork()).toEqual({ changes: 0, uploads: 0 })

    await db.syncQueue.bulkAdd([
      { entity: 'items', entityId: 'a', op: 'put', createdAt: 1, attempts: 0 },
      { entity: 'items', entityId: 'b', op: 'delete', createdAt: 2, attempts: 3 },
    ])
    const first = (await db.memories.toArray())[0]!
    await db.memories.put({ ...first, uploadState: 'failed' })
    expect(await unsentWork()).toEqual({ changes: 2, uploads: 1 })
  })
})

describe('whose data this device holds', () => {
  // These two start from a device that holds a real account's data (not the demo seed, which has its own test above).
  beforeEach(async () => { await db.meta.delete('seedVersion') })

  it('leaves the same account’s data alone', async () => {
    await claimDevice('uid-a')
    await claimDevice('uid-a')
    expect(await db.trips.count()).toBeGreaterThan(0)
  })

  it('removes the previous account’s data when a different account signs in', async () => {
    await claimDevice('uid-a')
    await claimDevice('uid-b')
    expect(await db.trips.count()).toBe(0)
    expect((await db.meta.get('accountUid'))?.value).toBe('uid-b')
  })

  it('claims an unclaimed device without wiping it, and can let go again', async () => {
    await db.meta.delete('seedVersion') // a device holding real data that simply has no owner on record (not demo-mode data)
    await claimDevice('uid-a')
    expect(await db.trips.count()).toBeGreaterThan(0)
    await releaseDevice()
    expect(await db.meta.get('accountUid')).toBeUndefined()
  })
})
