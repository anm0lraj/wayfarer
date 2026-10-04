import { db } from '@/data/db'
import { getBlob, putBlob } from '@/data/blobStore'
import { plainBlob } from '@/lib/media/plainBlob'
import { placeholderImage } from '@/lib/placeholder'
import { LOCAL_MEDIA_LIMITS } from './limits'
import type { StorageService } from './types'

const urlCache = new Map<string, string>()

/** Local blob storage in IndexedDB. Seed keys (`seed:<id>:<label>`) resolve to generated placeholder images. */
export const storageService: StorageService = {
  limits: LOCAL_MEDIA_LIMITS,

  async upload(blob, { path, onProgress, signal }) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    onProgress?.(0.4)
    const key = `${path}/${crypto.randomUUID()}`
    const stored = await plainBlob(blob) // see plainBlob: file-backed blobs can't always be stored in IndexedDB
    await putBlob(key, stored)
    onProgress?.(1)
    const url = URL.createObjectURL(stored)
    urlCache.set(key, url)
    return { key, url }
  },

  async getUrl(key) {
    if (key.startsWith('seed:')) {
      const [, id = key] = key.split(':')
      return placeholderImage(id)
    }
    const cached = urlCache.get(key)
    if (cached) return cached
    const blob = await getBlob(key)
    if (!blob) return undefined
    const url = URL.createObjectURL(blob)
    urlCache.set(key, url)
    return url
  },

  async publish(key, signal) {
    if (key.startsWith('seed:')) return
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (!(await getBlob(key))) throw new Error('The file is no longer on this device')
    await new Promise((r) => setTimeout(r, 120)) // stands in for the network round trip
  },

  async remove(key) {
    await db.blobs.delete(key)
    const url = urlCache.get(key)
    if (url) URL.revokeObjectURL(url)
    urlCache.delete(key)
  },
}
