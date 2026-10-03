import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { getFirebaseApp } from './app'

/** The Cloud Storage bucket for this environment's Firebase project. Only the storage adapter imports this. */
export function getBucket(): FirebaseStorage {
  return getStorage(getFirebaseApp())
}
