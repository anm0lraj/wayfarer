import { db } from '@/data/db'
import { photoUrl } from '@/lib/stock'
import type { StorageService } from './types'

const urlCache = new Map<string, string>()

/** Local blob storage in IndexedDB. Seed keys (`seed:<id>:<label>`) resolve to generated placeholder images. */
export const storageService: StorageService = {
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
    if (key.startsWith('seed:')) {
      const [, id = key] = key.split(':')
      return photoUrl(id)
    }
    const cached = urlCache.get(key)
    if (cached) return cached
    const rec = await db.blobs.get(key)
    if (!rec) return undefined
    const url = URL.createObjectURL(rec.blob)
    urlCache.set(key, url)
    return url
  },

  async publish(key, signal) {
    if (key.startsWith('seed:')) return
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (!(await db.blobs.get(key))) throw new Error('The file is no longer on this device')
    await new Promise((r) => setTimeout(r, 120)) // stands in for the network round trip
  },

  async remove(key) {
    await db.blobs.delete(key)
    const url = urlCache.get(key)
    if (url) URL.revokeObjectURL(url)
    urlCache.delete(key)
  },
}
