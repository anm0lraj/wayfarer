import { bytesOf } from '@/lib/media/plainBlob'
import { db } from './db'

/**
 * Photos and voice notes kept on the device (`blobs` table). Most browsers store a Blob directly. Some WebKit setups
 * (Safari private browsing in older versions, test browsers) refuse with a DataCloneError, so the raw bytes and type are
 * stored instead and put back together on the way out. Callers never see the difference.
 */
export async function putBlob(key: string, blob: Blob): Promise<void> {
  const createdAt = Date.now()
  try {
    await db.blobs.put({ key, blob, createdAt })
  } catch {
    await db.blobs.put({ key, bytes: await bytesOf(blob), type: blob.type, createdAt })
  }
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const rec = await db.blobs.get(key)
  if (!rec) return undefined
  return rec.blob ?? (rec.bytes ? new Blob([rec.bytes], { type: rec.type }) : undefined)
}
