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
    return initializeFirestore(app, { ignoreUndefinedProperties: true })
  } catch {
    // Already initialised (hot reload, second caller): reuse it.
    return getFirestore(getApps()[0] ?? app)
  }
}
