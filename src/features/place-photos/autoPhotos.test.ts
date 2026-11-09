import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import { db } from '@/data/db'
import { itineraryRepo } from '@/data/repositories'
import { resetDemoData } from '@/data/seed'
import { mockPlacePhotos } from '@/services/placePhotos/mock'
import { PlacePhotoError, type PlacePhotoResult, type PlacePhotoService } from '@/services/placePhotos/types'
import { settle } from '@/test/settle'
import type { ItemCategory } from '@/types'
import { attachPlacePhotos, photoQueryFor, resetAutoPhotoFailures, schedulePlacePhotos } from './autoPhotos'

const TRIP = 'trip-bali'
const unsplash: PlacePhotoResult = {
  url: 'https://images.unsplash.com/photo-1?ixid=a&w=1280&fm=webp&q=60', width: 1280, height: 853, alt: 'A cafe',
  credit: { name: 'Ana', profileUrl: 'https://unsplash.com/@ana?utm_source=a&utm_medium=referral', provider: 'Unsplash', providerUrl: 'https://unsplash.com/?utm_source=a&utm_medium=referral', photoUrl: 'https://unsplash.com/photos/1?utm_source=a&utm_medium=referral' },
  downloadLocation: 'https://api.unsplash.com/photos/1/download?ixid=a',
}

function fakeService(search: PlacePhotoService['search'] = async () => unsplash) {
  return { search: vi.fn(search), track: vi.fn(async () => {}) }
}

const addCustom = (name: string, category: ItemCategory = 'food', dayId = 'day-1') =>
  itineraryRepo.addItem(TRIP, dayId, { title: name, startTime: '16:00', durationMin: 60, category, customLocation: { name, point: { lat: -8.43, lng: 115.28 } } })

let qc: QueryClient
const run = (service: PlacePhotoService, online = () => true) => attachPlacePhotos({ tripId: TRIP, service, qc, online })

beforeEach(async () => {
  setActorId(DEMO_USER_ID)
  await resetDemoData()
  resetAutoPhotoFailures()
  qc = new QueryClient()
})
afterEach(async () => {
  await settle(50)
})

describe('which stops get an automatic photo', () => {
  const base = { id: 'i', tripId: 't', dayId: 'd', position: 0, startTime: '10:00', durationMin: 60, title: 'Coffee', status: 'upcoming', source: 'user', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' } as const
  const at = { name: 'Revolver Espresso', point: { lat: 0, lng: 0 } }
  it('only custom places, not catalogue stops, transport, stays or free time, and never ones with a real photo', () => {
    expect(photoQueryFor({ ...base, category: 'food', customLocation: at }, 'Bali')).toMatchObject({ name: 'Revolver Espresso', area: 'Bali', key: 'Revolver Espresso, Bali' })
    expect(photoQueryFor({ ...base, category: 'food' }, 'Bali')).toBeUndefined() // a name only, no place
    expect(photoQueryFor({ ...base, category: 'food', placeId: 'p-x', customLocation: at }, 'Bali')).toBeUndefined()
    for (const c of ['transport', 'lodging', 'free_time'] as const) expect(photoQueryFor({ ...base, category: c, customLocation: at }, 'Bali')).toBeUndefined()
    expect(photoQueryFor({ ...base, category: 'food', customLocation: at, image: '/photos/bali-1280.webp' }, 'Bali')).toBeUndefined()
    expect(photoQueryFor({ ...base, category: 'beach', customLocation: { ...at, name: 'Sanur Beach, Bali' } }, 'Bali')?.key).toBe('Sanur Beach, Bali')
  })
})

describe('attaching photos in the background', () => {
  it('searches a new custom stop once, stores the photo with its credit on the item, and tells the provider', async () => {
    const item = await addCustom('Revolver Espresso')
    const service = fakeService()
    expect(await run(service)).toBe(1)
    expect(service.search).toHaveBeenCalledOnce()
    expect(service.search.mock.calls[0]![0]).toEqual({ name: 'Revolver Espresso', area: 'Bali' })
    const stored = (await db.items.get(item.id))!
    expect(stored.autoPhoto).toEqual({ query: 'Revolver Espresso, Bali', photo: { url: unsplash.url, width: 1280, height: 853, alt: 'A cafe', credit: unsplash.credit } })
    expect(JSON.stringify(stored)).not.toContain('download') // the download address is used once, never stored
    expect(service.track).toHaveBeenCalledWith(unsplash)
    // Stored, so it is never searched again, even in a fresh session.
    expect(await attachPlacePhotos({ tripId: TRIP, service, qc: new QueryClient(), online: () => true })).toBe(0)
    expect(service.search).toHaveBeenCalledOnce()
    // The write is queued for sync like any edit.
    expect((await db.syncQueue.toArray()).some((q) => q.entityId === item.id && (q.payload as { autoPhoto?: unknown })?.autoPhoto)).toBe(true)
  })

  it('remembers "nothing suitable" so the illustration stays and the place is not searched again', async () => {
    const item = await addCustom('Somewhere Nobody Photographs')
    const service = fakeService(async () => null)
    await run(service)
    await run(service)
    expect(service.search).toHaveBeenCalledOnce()
    expect((await db.items.get(item.id))!.autoPhoto).toEqual({ query: 'Somewhere Nobody Photographs, Bali' })
    expect(service.track).not.toHaveBeenCalled()
  })

  it('asks once for two stops at the same place', async () => {
    const a = await addCustom('Revolver Espresso', 'food', 'day-1')
    const b = await addCustom('Revolver Espresso', 'food', 'day-2')
    const service = fakeService()
    expect(await run(service)).toBe(2)
    expect(service.search).toHaveBeenCalledOnce()
    expect((await db.items.get(b.id))!.autoPhoto?.photo?.url).toBe((await db.items.get(a.id))!.autoPhoto?.photo?.url)
  })

  it('does not search while offline, and does once the device is back online', async () => {
    const item = await addCustom('Revolver Espresso')
    const service = fakeService()
    expect(await run(service, () => false)).toBe(0)
    expect(service.search).not.toHaveBeenCalled()
    await run(service, () => true)
    expect((await db.items.get(item.id))!.autoPhoto?.photo).toBeDefined()
  })

  it('stops on a network failure and tries again later, without storing anything', async () => {
    const item = await addCustom('Revolver Espresso')
    let offline = true
    const service = fakeService(async () => { if (offline) throw new PlacePhotoError('Network unavailable', true); return unsplash })
    expect(await run(service)).toBe(0)
    expect((await db.items.get(item.id))!.autoPhoto).toBeUndefined()
    offline = false
    expect(await run(service)).toBe(1)
    expect(service.search).toHaveBeenCalledTimes(2)
  })

  it('does not retry a refused search in the same session, and stores nothing so a later session can', async () => {
    const item = await addCustom('Revolver Espresso')
    const service = fakeService(async () => { throw new PlacePhotoError('Photo search failed (503)', false) })
    await run(service)
    await run(service)
    expect(service.search).toHaveBeenCalledOnce()
    expect((await db.items.get(item.id))!.autoPhoto).toBeUndefined()
    resetAutoPhotoFailures() // the next app start
    await attachPlacePhotos({ tripId: TRIP, service: fakeService(), qc: new QueryClient(), online: () => true })
    expect((await db.items.get(item.id))!.autoPhoto?.photo).toBeDefined()
  })

  it('searches again when the stop moves to another place, and drops the photo when its place is cleared', async () => {
    const item = await addCustom('Revolver Espresso')
    const service = fakeService()
    await run(service)
    await itineraryRepo.updateItem(item.id, { customLocation: { name: 'Sea Vu Play', point: { lat: -8.7, lng: 115.17 } } })
    await run(service)
    expect(service.search).toHaveBeenCalledTimes(2)
    expect((await db.items.get(item.id))!.autoPhoto?.query).toBe('Sea Vu Play, Bali')
    await itineraryRepo.updateItem(item.id, { customLocation: undefined })
    await run(service)
    expect((await db.items.get(item.id))!.autoPhoto).toBeUndefined()
  })

  it('leaves catalogue stops and transport alone', async () => {
    await addCustom('Airport taxi', 'transport')
    const service = fakeService()
    expect(await run(service)).toBe(0)
    expect(service.search).not.toHaveBeenCalled()
  })

  it('never writes for someone who can only view the trip', async () => {
    await addCustom('Revolver Espresso')
    setActorId('someone-else')
    const service = fakeService()
    expect(await run(service)).toBe(0)
    expect(service.search).not.toHaveBeenCalled()
  })

  it('runs one pass at a time per trip', async () => {
    await addCustom('Revolver Espresso')
    const service = fakeService()
    await Promise.all([schedulePlacePhotos({ tripId: TRIP, service, qc, online: () => true }), schedulePlacePhotos({ tripId: TRIP, service, qc, online: () => true })])
    expect(service.search).toHaveBeenCalledOnce()
  })

  it('with the demo adapter, a known place gets its catalogue photo, credited', async () => {
    const item = await addCustom('Tegallalang Rice Terrace', 'sightseeing')
    await run(mockPlacePhotos)
    expect((await db.items.get(item.id))!.autoPhoto?.photo).toMatchObject({ url: '/photos/p-tegallalang-1280.webp', credit: { provider: 'Wikimedia Commons' } })
  })
})
