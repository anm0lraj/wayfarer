export interface UploadOptions {
  path: string
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface StoredFile {
  key: string
  url: string
}

/** What this storage backend can hold, so screens can offer only what will work. */
export interface StorageLimits {
  /** Largest single file, in bytes. */
  maxBytes: number
  /** Whether video can be stored. */
  video: boolean
  /** Longest voice note worth recording, in seconds (so it fits `maxBytes`). */
  voiceSeconds: number
}

export interface StorageService {
  readonly limits: StorageLimits
  upload(blob: Blob, opts: UploadOptions): Promise<StoredFile>
  /** Resolve a storage key to a displayable URL (object URL, signed URL, or generated placeholder for seed keys). */
  getUrl(key: string): Promise<string | undefined>
  /** Pushes a locally stored file to remote storage. Throws if it can't, so the caller can retry. */
  publish(key: string, signal?: AbortSignal): Promise<void>
  remove(key: string): Promise<void>
}
