/**
 * A copy of `blob` that lives in memory instead of pointing at a file the browser is holding. A photo picked from the
 * gallery is such a file-backed `File`; some Safari/WebKit versions refuse to store those in IndexedDB ("BlobURLs are not
 * yet supported") and Safari can lose them if the original changes. Copying the bytes first makes storing reliable.
 * Costs one read of a file that is at most a few hundred KB after compression (a voice note or video: the limit).
 */
export async function plainBlob(blob: Blob): Promise<Blob> {
  return new Blob([await bytesOf(blob)], { type: blob.type })
}

/** `Blob.arrayBuffer()` where it exists, a FileReader where it does not (older browsers, jsdom). */
export function bytesOf(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('Couldn’t read the file'))
    reader.readAsArrayBuffer(blob)
  })
}
