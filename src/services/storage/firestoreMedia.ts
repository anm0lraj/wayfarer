import { Bytes, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/data/db'
import { placeholderImage } from '@/lib/placeholder'
import { getDb } from '@/services/firebase/firestore'
import { FIRESTORE_MEDIA_LIMITS } from './limits'
import type { StorageService } from './types'

const urlCache = new Map<string, string>()

/**
 * `trips/{tripId}/memories/{id}` (the key the capture screen asks for) is stored at `trips/{tripId}/media/{id}`. The
 * trip id in the path is what ties the file's access to the trip's members in the security rules.
 */
function mediaPath(key: string): string {
  const m = /^trips\/([^/]+)\/memories\/([^/]+)$/.exec(key)
  if (!m) throw new Error(`Not a trip media key: ${key}`)
  return `trips/${m[1]}/media/${m[2]}`
}
const tripIdOf = (key: string) => /^trips\/([^/]+)\//.exec(key)![1]!

/**
 * Photos and voice notes kept in Firestore (no Cloud Storage needed, so no billing plan). Offline-first: `upload`
 * saves the file on the device at once, `publish` writes it to Firestore later from the upload queue. The files are
 * small (photos are already resized; voice notes are capped), and video is not supported by this backend.
 * Replace this one file to move media to Cloudflare R2 or Cloud Storage; screens only see `StorageService`.
 */
export const firestoreMediaService: StorageService = {
  limits: FIRESTORE_MEDIA_LIMITS,

  async upload(blob, { path, onProgress, signal }) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (blob.size > FIRESTORE_MEDIA_LIMITS.maxBytes) throw new Error('That file is too large to store.')
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
    let blob = (await db.blobs.get(key))?.blob
    if (!blob) {
      // Not on this device (someone else's photo, or a new device): fetch it, and keep a copy for next time.
      try {
        const snap = await getDoc(doc(getDb(), mediaPath(key)))
        if (!snap.exists()) return undefined
        const data = snap.data() as { data: Bytes; mime: string }
        blob = new Blob([data.data.toUint8Array()], { type: data.mime })
        await db.blobs.put({ key, blob, createdAt: Date.now() })
      } catch {
        return undefined // offline, or not a member of the trip
      }
    }
    const url = URL.createObjectURL(blob)
    urlCache.set(key, url)
    return url
  },

  async publish(key, signal) {
    if (key.startsWith('seed:')) return
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const local = await db.blobs.get(key)
    if (!local) throw new Error('The file is no longer on this device')
    const { blob } = local
    if (blob.size > FIRESTORE_MEDIA_LIMITS.maxBytes) throw new Error('That file is too large to store.')
    const mime = blob.type || 'application/octet-stream'
    if (!/^(image|audio)\//.test(mime)) throw new Error('Only photos and voice notes can be stored.')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    await setDoc(doc(getDb(), mediaPath(key)), {
      id: key.split('/').pop(), tripId: tripIdOf(key), mime, size: bytes.byteLength, data: Bytes.fromUint8Array(bytes), createdAt: new Date().toISOString(),
    })
  },

  async remove(key) {
    await db.blobs.delete(key)
    const url = urlCache.get(key)
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    urlCache.delete(key)
    try {
      await deleteDoc(doc(getDb(), mediaPath(key)))
    } catch {
      console.warn(`Couldn't remove ${key} from the server.`) // must not stop the memory being deleted locally
    }
  },
}
