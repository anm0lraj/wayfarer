import { db } from '@/data/db'
import { getActorId } from '@/data/actor'
import { notificationRepo } from '@/data/repositories'
import type { NotificationService, PushPermission } from './types'

const supported = () => typeof window !== 'undefined' && 'Notification' in window

/** In-app notification centre backed by Dexie. System notifications only while the app is open and permitted (FCM comes later). */
export const notificationService: NotificationService = {
  getPermission(): PushPermission {
    return supported() ? (Notification.permission as PushPermission) : 'unsupported'
  },

  async requestPermission() {
    if (!supported()) return 'unsupported'
    return (await Notification.requestPermission()) as PushPermission
  },

  async isEnabled(type) {
    const id = getActorId()
    const user = id ? await db.users.get(id) : undefined
    return user?.settings.notificationPrefs[type] ?? true
  },

  async deliver(n) {
    if (!(await notificationService.isEnabled(n.type))) return null // per-type preference
    const saved = await notificationRepo.add(n)
    if (notificationService.getPermission() === 'granted') new Notification(n.title, { body: n.body, tag: saved.id })
    return saved
  },

  list: () => notificationRepo.list(),
  markRead: (id) => notificationRepo.markRead(id),
}
