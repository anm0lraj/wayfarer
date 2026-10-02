import { getApps } from 'firebase/app'
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore'
import { getFirebaseApp } from './app'

/**
 * The Firestore instance for this environment. `ignoreUndefinedProperties` matters: our records leave optional fields
 * `undefined`, and Firestore would otherwise reject the whole write.
 */
export function getDb(): Firestore {
  const app = getFirebaseApp()
  try {
    // Auto-detect long polling: some networks, proxies and embedded browsers break Firestore's default streaming
    // transport ("Could not reach Cloud Firestore backend"), and this falls back to plain requests there.
    return initializeFirestore(app, { ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true })
  } catch {
    // Already initialised (hot reload, second caller): reuse it.
    return getFirestore(getApps()[0] ?? app)
  }
}
