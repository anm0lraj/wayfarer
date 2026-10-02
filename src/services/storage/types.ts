export interface UploadOptions {
  path: string
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

export interface StoredFile {
  key: string
  url: string
}

export interface StorageService {
  upload(blob: Blob, opts: UploadOptions): Promise<StoredFile>
  /** Resolve a storage key to a displayable URL (object URL, signed URL, or generated placeholder for seed keys). */
  getUrl(key: string): Promise<string | undefined>
  /** Pushes a locally stored file to remote storage (Firebase Storage later). Throws if it can't, so the caller can retry. */
  publish(key: string, signal?: AbortSignal): Promise<void>
  remove(key: string): Promise<void>
}
