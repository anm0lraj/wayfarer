import { db } from '@/data/db'
import { getActorId } from '@/data/actor'
import { notificationRepo } from '@/data/repositories'
import type { NotificationService, PushChannel, PushPermission } from './types'

const supported = () => typeof window !== 'undefined' && 'Notification' in window

/** No push: the demo backend and any build without a web push key. Reminders stay in the app. */
export const noPush: PushChannel = {
  available: false,
  register: async () => false,
  unregister: async () => undefined,
  isRegistered: async () => false,
  sendTest: async () => 'unavailable',
}

/**
 * The in-app notification centre (Dexie). A system notification is shown from here only while the app is open and
 * permitted, and only when the server is not already pushing to this device (otherwise there would be two).
 */
export function createNotificationService(push: PushChannel): NotificationService {
  const service: NotificationService = {
    push,

    getPermission(): PushPermission {
      return supported() ? (Notification.permission as PushPermission) : 'unsupported'
    },

    async requestPermission() {
      if (!supported()) return 'unsupported'
      const result = (await Notification.requestPermission()) as PushPermission
      if (result === 'granted' && push.available) await push.register().catch(() => false)
      return result
    },

    async isEnabled(type) {
      const id = getActorId()
      const user = id ? await db.users.get(id) : undefined
      return user?.settings.notificationPrefs[type] ?? true
    },

    async deliver(n) {
      if (!(await service.isEnabled(n.type))) return null // per-type preference
      if (n.key && (await notificationRepo.list()).some((x) => x.key === n.key)) return null // already delivered
      const saved = await notificationRepo.add(n)
      if (service.getPermission() === 'granted' && !(await push.isRegistered())) new Notification(n.title, { body: n.body, tag: saved.id })
      return saved
    },

    list: () => notificationRepo.list(),
    markRead: (id) => notificationRepo.markRead(id),
  }
  return service
}

export const notificationService = createNotificationService(noPush)
