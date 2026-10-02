import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { env } from '@/config/env'

/**
 * The one Firebase app for this environment (`wayfarer-dev` or `wayfarer-prod`, chosen by `VITE_APP_ENV` and checked in
 * `config/env.ts`). Only the Firebase adapters import this; screens never see the SDK.
 */
export function getFirebaseApp(): FirebaseApp {
  const config = env.firebase
  if (!config) throw new Error('Firebase is not configured for this environment (VITE_BACKEND is "mock").')
  return getApps()[0] ?? initializeApp(config)
}
