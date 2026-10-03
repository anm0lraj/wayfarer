import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import { resetDemoData } from '@/data/seed'
import { parseEnv } from '@/config/env'
import { installMockApi } from '@/mocks/install'
import { createNotificationService, noPush } from './mock'
import type { PushChannel } from './types'

installMockApi()

const shown: Array<{ title: string; options?: NotificationOptions }> = []
function fakeBrowserNotification(permission: NotificationPermission) {
  class Fake {
    static permission = permission
    static requestPermission = vi.fn(async () => permission)
    constructor(title: string, options?: NotificationOptions) { shown.push({ title, options }) }
  }
  vi.stubGlobal('Notification', Fake)
  return Fake
}

const channel = (over: Partial<PushChannel> = {}): PushChannel => ({
  available: true, register: vi.fn(async () => true), unregister: vi.fn(async () => undefined), isRegistered: vi.fn(async () => false), sendTest: vi.fn(async () => 'sent' as const), ...over,
})
const reminder = { type: 'trip_countdown' as const, tripId: 'trip-bali', title: 'Soon', body: 'Pack', deepLink: '/trips/trip-bali', key: 'k1', scheduledFor: '2026-10-05T00:00:00.000Z' }

beforeEach(async () => {
  shown.length = 0
  setActorId(DEMO_USER_ID)
  await resetDemoData()
})
afterEach(() => vi.unstubAllGlobals())

describe('turning notifications on', () => {
  it('registers the device for push once the person has said yes', async () => {
    fakeBrowserNotification('granted')
    const push = channel()
    expect(await createNotificationService(push).requestPermission()).toBe('granted')
    expect(push.register).toHaveBeenCalledOnce()
  })

  it('does not register a device that was refused, or when push is not available here', async () => {
    fakeBrowserNotification('denied')
    const push = channel()
    await createNotificationService(push).requestPermission()
    expect(push.register).not.toHaveBeenCalled()

    fakeBrowserNotification('granted')
    const unavailable = channel({ available: false })
    await createNotificationService(unavailable).requestPermission()
    expect(unavailable.register).not.toHaveBeenCalled()
  })

  it('still reports the permission when registering fails', async () => {
    fakeBrowserNotification('granted')
    const push = channel({ register: vi.fn(async () => { throw new Error('no worker') }) })
    expect(await createNotificationService(push).requestPermission()).toBe('granted')
  })
})

describe('one notification, not two', () => {
  it('shows a system notification from the app while no push is registered', async () => {
    fakeBrowserNotification('granted')
    await createNotificationService(noPush).deliver(reminder)
    expect(shown.map((s) => s.title)).toEqual(['Soon'])
  })

  it('leaves the system notification to the server once this device is registered, but still lists it in the app', async () => {
    fakeBrowserNotification('granted')
    const service = createNotificationService(channel({ isRegistered: vi.fn(async () => true) }))
    expect(await service.deliver(reminder)).not.toBeNull()
    expect(shown).toEqual([])
    expect((await service.list()).some((n) => n.key === 'k1')).toBe(true)
  })

  it('shows nothing when system notifications were not allowed', async () => {
    fakeBrowserNotification('default')
    await createNotificationService(noPush).deliver(reminder)
    expect(shown).toEqual([])
  })
})

describe('the demo build', () => {
  it('has no push and says so', async () => {
    expect(noPush.available).toBe(false)
    expect(await noPush.register()).toBe(false)
    expect(await noPush.sendTest()).toBe('unavailable')
  })
})

describe('configuring push', () => {
  const firebase = { VITE_BACKEND: 'firebase', VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_AUTH_DOMAIN: 'a', VITE_FIREBASE_PROJECT_ID: 'wayfarer-dev-x', VITE_FIREBASE_STORAGE_BUCKET: 'b', VITE_FIREBASE_APP_ID: 'i' }
  it('is on only with the Firebase backend and a push key', () => {
    expect(parseEnv({ ...firebase, VITE_FIREBASE_VAPID_KEY: 'BPublicKey' }).pushKey).toBe('BPublicKey')
    expect(parseEnv(firebase).pushKey).toBeUndefined()
    expect(parseEnv({ ...firebase, VITE_FIREBASE_VAPID_KEY: '' }).pushKey).toBeUndefined()
    expect(parseEnv({ VITE_FIREBASE_VAPID_KEY: 'BPublicKey' }).pushKey).toBeUndefined() // demo backend
  })
})
