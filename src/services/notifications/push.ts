import { getAuth } from 'firebase/auth'
import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { env } from '@/config/env'
import { db } from '@/data/db'
import { getFirebaseApp } from '@/services/firebase/app'
import { getDb } from '@/services/firebase/firestore'
import type { PushChannel, TestPushResult } from './types'

/**
 * Web push through Firebase Cloud Messaging. Registering gets this browser a token (from the app's existing service
 * worker, which handles the `push` event in `public/push-sw.js`) and stores it at `users/{uid}/devices/{id}`, where the
 * server's sweep finds it. Only the signed-in person can write that record (security rules), and signing out removes it.
 */
const ID_KEY = 'pushDeviceId'
const STATE_KEY = 'pushState'
const REFRESH_AFTER_MS = 7 * 86_400_000
const WORKER_WAIT_MS = 5_000

interface PushState { uid: string; token: string; at: number }

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function deviceId(): Promise<string> {
  const stored = (await db.meta.get(ID_KEY))?.value
  if (typeof stored === 'string') return stored
  const id = `dev_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
  await db.meta.put({ key: ID_KEY, value: id })
  return id
}

const readState = async () => (await db.meta.get(STATE_KEY))?.value as PushState | undefined

/** The service worker, or nothing if there isn't one (development builds don't register it). */
async function worker(): Promise<ServiceWorkerRegistration | undefined> {
  return Promise.race([navigator.serviceWorker.ready, new Promise<undefined>((r) => setTimeout(() => r(undefined), WORKER_WAIT_MS))])
}

const platform = () => (/iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios-web' : /Android/.test(navigator.userAgent) ? 'android-web' : 'web')

export const firebasePush: PushChannel = {
  available: env.backend === 'firebase' && !!env.pushKey && supported(),

  async register() {
    const key = env.pushKey
    if (!key || !supported() || Notification.permission !== 'granted') return false
    const auth = getAuth(getFirebaseApp())
    await auth.authStateReady() // on app load the saved session is restored a moment after this runs
    const uid = auth.currentUser?.uid
    if (!uid) return false
    const { deleteToken, getMessaging, getToken, isSupported } = await import('firebase/messaging')
    if (!(await isSupported())) return false
    const registration = await worker()
    if (!registration) return false
    const messaging = getMessaging(getFirebaseApp())
    let last = await readState()
    // Another account was here and never unregistered (closed tab, lost session): mint a new token so the old account's
    // record, which this account cannot delete, stops working instead of delivering this person's reminders here.
    if (last && last.uid !== uid) await deleteToken(messaging).catch(() => false)
    // The worker was reset (unregistered, site data cleared) so the browser's push subscription is gone, but Firebase and
    // the server still hold a token for it and Google keeps accepting messages for it: they would never arrive. Start over.
    else if (last && !(await registration.pushManager.getSubscription())) {
      await deleteToken(messaging).catch(() => false)
      await db.meta.delete(STATE_KEY)
      last = undefined
    }
    const token = await getToken(messaging, { vapidKey: key, serviceWorkerRegistration: registration })
    if (!token) return false
    // Unchanged and recent: nothing to write (this runs on every app load).
    if (last && last.uid === uid && last.token === token && Date.now() - last.at < REFRESH_AFTER_MS) return true
    await setDoc(doc(getDb(), `users/${uid}/devices/${await deviceId()}`), {
      token, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', platform: platform(), updatedAt: new Date().toISOString(),
    })
    await db.meta.put({ key: STATE_KEY, value: { uid, token, at: Date.now() } satisfies PushState })
    return true
  },

  /** Best effort: removes the server's record (needs the person still signed in) and invalidates the token. */
  async unregister() {
    const state = await readState()
    await db.meta.delete(STATE_KEY)
    if (!state || !supported()) return
    try { await deleteDoc(doc(getDb(), `users/${state.uid}/devices/${await deviceId()}`)) } catch { /* offline: the token is invalidated below, and the server drops a dead token on its next send */ }
    try {
      const { deleteToken, getMessaging, isSupported } = await import('firebase/messaging')
      if (await isSupported()) await deleteToken(getMessaging(getFirebaseApp()))
    } catch { /* nothing more to do */ }
  },

  async isRegistered() {
    if (!supported() || Notification.permission !== 'granted') return false
    const uid = getAuth(getFirebaseApp()).currentUser?.uid
    const state = await readState()
    return !!uid && state?.uid === uid
  },

  async sendTest(): Promise<TestPushResult> {
    const token = await getAuth(getFirebaseApp()).currentUser?.getIdToken()
    if (!token) return 'unavailable'
    try {
      const res = await fetch('/api/push/test', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 429) return 'too_soon'
      if (!res.ok) return 'unavailable'
      const body = (await res.json()) as { devices: number; sent: number }
      return body.sent > 0 ? 'sent' : body.devices === 0 ? 'no_device' : 'unavailable'
    } catch {
      return 'unavailable'
    }
  },
}
