import { memoryRepo } from './repositories'
import type { StorageService } from '@/services/storage/types'

let running = false

export interface UploadResult { uploaded: number; failed: number }

/**
 * Sends queued memory media to remote storage. Safe to call any time: it does nothing while offline or
 * already running. Memories without a file (text, location) have nothing to send and are just marked done.
 * A failure marks that memory `failed` (the traveller can retry) and carries on with the rest.
 * `retryFailed` is for the manual "Retry" button; the automatic runs leave failed items alone.
 */
export async function processMemoryUploads(storage: StorageService, opts: { retryFailed?: boolean } = {}): Promise<UploadResult> {
  const result: UploadResult = { uploaded: 0, failed: 0 }
  if (running || (typeof navigator !== 'undefined' && !navigator.onLine)) return result
  running = true
  try {
    for (const m of await memoryRepo.pending(opts.retryFailed)) {
      try {
        if (m.mediaKey) {
          await memoryRepo.update(m.id, { uploadState: 'uploading' })
          await storage.publish(m.mediaKey)
        }
        await memoryRepo.update(m.id, { uploadState: 'done' })
        result.uploaded++
      } catch {
        await memoryRepo.update(m.id, { uploadState: 'failed' }).catch(() => {})
        result.failed++
      }
    }
  } finally {
    running = false
  }
  return result
}
