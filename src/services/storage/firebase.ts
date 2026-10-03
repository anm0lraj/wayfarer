import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { db } from '@/data/db'
import { placeholderImage } from '@/lib/placeholder'
import { getBucket } from '@/services/firebase/storage'
import type { StorageService } from './types'

const urlCache = new Map<string, string>()

/**
 * Media in Firebase Storage, offline-first. `upload` saves the file on the device straight away (so capturing never
 * waits for the network); `publish` sends it to the bucket later, from the upload queue. The key is also the object's
 * path (`trips/{tripId}/memories/{id}`), and the storage rules let a trip's members read and its editors write there.
 */
export const firebaseStorageService: StorageService = {
  async upload(blob, { path, onProgress, signal }) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    onProgress?.(0.4)
    const key = `${path}/${crypto.randomUUID()}`
    await db.blobs.put({ key, blob, createdAt: Date.now() })
    onProgress?.(1)
    const url = URL.createObjectURL(blob)
    urlCache.set(key, url)
    return { key, url }
  },

  async getUrl(key) {
    if (key.startsWith('seed:')) return placeholderImage(key.split(':')[1] ?? key)
    const cached = urlCache.get(key)
    if (cached) return cached
    const local = await db.blobs.get(key)
    if (local) {
      const url = URL.createObjectURL(local.blob)
      urlCache.set(key, url)
      return url
    }
    // Not on this device (someone else's photo, or a new device): ask the bucket for a link. Offline or no access → no image.
    try {
      const url = await getDownloadURL(ref(getBucket(), key))
      urlCache.set(key, url)
      return url
    } catch {
      return undefined
    }
  },

  async publish(key, signal) {
    if (key.startsWith('seed:')) return
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const local = await db.blobs.get(key)
    if (!local) throw new Error('The file is no longer on this device')
    const task = uploadBytesResumable(ref(getBucket(), key), local.blob, { contentType: local.blob.type || 'application/octet-stream' })
    const cancel = () => task.cancel()
    signal?.addEventListener('abort', cancel, { once: true })
    try {
      await task
    } finally {
      signal?.removeEventListener('abort', cancel)
    }
  },

  async remove(key) {
    await db.blobs.delete(key)
    const url = urlCache.get(key)
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    urlCache.delete(key)
    try {
      await deleteObject(ref(getBucket(), key))
    } catch (e) {
      // Already gone is fine. Anything else (offline, no permission) must not stop the memory being deleted locally.
      if ((e as { code?: string }).code !== 'storage/object-not-found') console.warn(`Couldn't remove ${key} from storage.`)
    }
  },
}
