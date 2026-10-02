import type { Notification, NotificationType } from '@/types'

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export interface NotificationService {
  /** Current browser permission without prompting. */
  getPermission(): PushPermission
  /**
   * Triggers the browser permission prompt. Callers must show an in-context explanation first
   * (e.g. right after creating a trip) — never call this on first load.
   */
  requestPermission(): Promise<PushPermission>
  /** Adds to the in-app notification centre (always works) and shows a system notification only if permitted. */
  deliver(n: Omit<Notification, 'id' | 'userId'>): Promise<Notification | null>
  list(): Promise<Notification[]>
  markRead(id: string): Promise<void>
  isEnabled(type: NotificationType): Promise<boolean>
}
