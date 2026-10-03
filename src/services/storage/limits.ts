import type { StorageLimits } from './types'

/** Photos and voice notes are stored inside Firestore documents, which hold at most 1 MiB; stay clear of it. */
export const FIRESTORE_MEDIA_LIMITS: StorageLimits = { maxBytes: 900_000, video: false, voiceSeconds: 90 }

/** The demo backend keeps files on the device, so it can take what a phone camera produces. */
export const LOCAL_MEDIA_LIMITS: StorageLimits = { maxBytes: 50 * 1024 * 1024, video: true, voiceSeconds: 600 }
