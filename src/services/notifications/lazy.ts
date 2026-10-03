import { env } from '@/config/env'
import type { PushChannel } from './types'

/** Browsers that can do web push at all (iPhone only once the app is on the Home Screen). */
const capable = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** The Firebase push channel, loaded on first use so the Messaging SDK is not in the first bundle. */
export function lazyPush(load: () => Promise<PushChannel>): PushChannel {
  let loaded: Promise<PushChannel> | undefined
  const channel = () => (loaded ??= load())
  return {
    available: env.backend === 'firebase' && !!env.pushKey && capable(),
    register: () => channel().then((c) => c.register()),
    unregister: () => channel().then((c) => c.unregister()),
    isRegistered: () => (capable() && Notification.permission === 'granted' ? channel().then((c) => c.isRegistered()) : Promise.resolve(false)),
    sendTest: () => channel().then((c) => c.sendTest()),
  }
}
