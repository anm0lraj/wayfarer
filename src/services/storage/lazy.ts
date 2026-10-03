import type { StorageLimits, StorageService } from './types'

/** The Firestore media adapter, loaded on first use so the demo build and the first paint don't pay for the SDK. */
export function lazyStorageService(load: () => Promise<StorageService>, limits: StorageLimits): StorageService {
  let loaded: Promise<StorageService> | undefined
  const svc = () => (loaded ??= load())
  return {
    limits,
    upload: (blob, opts) => svc().then((s) => s.upload(blob, opts)),
    getUrl: (key) => svc().then((s) => s.getUrl(key)),
    publish: (key, signal) => svc().then((s) => s.publish(key, signal)),
    remove: (key) => svc().then((s) => s.remove(key)),
  }
}
