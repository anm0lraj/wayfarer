import type { StorageService } from './types'

/** The Firebase storage adapter, loaded on first use so the demo build and the first paint don't pay for the SDK. */
export function lazyStorageService(load: () => Promise<StorageService>): StorageService {
  let loaded: Promise<StorageService> | undefined
  const svc = () => (loaded ??= load())
  return {
    upload: (blob, opts) => svc().then((s) => s.upload(blob, opts)),
    getUrl: (key) => svc().then((s) => s.getUrl(key)),
    publish: (key, signal) => svc().then((s) => s.publish(key, signal)),
    remove: (key) => svc().then((s) => s.remove(key)),
  }
}
