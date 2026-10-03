import type { Notification, NotificationType } from '@/types'

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export type TestPushResult = 'sent' | 'no_device' | 'too_soon' | 'unavailable'

/**
 * Reminders that reach the device while the app is closed (web push through Firebase Cloud Messaging). Without it the
 * in-app centre still works; `available` is false on the demo backend and when no push key is configured.
 */
export interface PushChannel {
  readonly available: boolean
  /** Registers this browser for the signed-in account. Never prompts: the permission must already be granted. */
  register(): Promise<boolean>
  /** Stops reminders reaching this browser (used when signing out). */
  unregister(): Promise<void>
  isRegistered(): Promise<boolean>
  /** Asks the server to send one test notification to the signed-in person's devices. */
  sendTest(): Promise<TestPushResult>
}

export interface NotificationService {
  /** Current browser permission without prompting. */
  getPermission(): PushPermission
  /**
   * Triggers the browser permission prompt. Callers must show an in-context explanation first
   * (e.g. right after creating a trip) — never call this on first load. When granted, the device is also registered for push.
   */
  requestPermission(): Promise<PushPermission>
  /**
   * Adds to the in-app notification centre (always works) and shows a system notification only if permitted.
   * Returns null when the type is switched off or a notification with the same `key` was already delivered.
   */
  deliver(n: Omit<Notification, 'id' | 'userId'>): Promise<Notification | null>
  list(): Promise<Notification[]>
  markRead(id: string): Promise<void>
  isEnabled(type: NotificationType): Promise<boolean>
  push: PushChannel
}
