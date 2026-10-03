/** Longest edge of a stored photo. Phone cameras produce 12 MP+; a trip journal doesn't need that. */
export const MAX_EDGE = 1600
export const JPEG_QUALITY = 0.82

/** Scales (w, h) so the longest edge is at most `max`, keeping aspect ratio. Never upscales. */
export function fitWithin(w: number, h: number, max = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

/**
 * Resizes and re-encodes a photo as JPEG before it is stored or uploaded. Re-encoding also removes EXIF
 * (including GPS) from the saved file. If the browser can't decode or encode (no canvas, odd format) the
 * original is returned unchanged so the traveller never loses a photo.
 */
export async function compressImage(file: Blob, maxEdge = MAX_EDGE): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function') return file
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    return out && out.size < file.size ? out : file
  } catch {
    return file
  }
}

/** Longest edge of a trip cover: cards show it at most ~1000 px wide, and it is stored inline with the trip. */
export const COVER_EDGE = 1024
/** Covers are stored inside the trip record (and synced with it), so refuse anything that would still be large. */
export const MAX_COVER_BYTES = 300_000

/**
 * Turns a picked photo into a small data URL for `trip.coverImage`: resized, re-encoded (which strips EXIF/GPS) and
 * self-contained, so it works offline, survives reloads and can be published without an object URL going stale.
 * Throws a user-readable message for non-images or ones that can't be made small enough.
 */
export async function coverFromFile(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  const small = await compressImage(file, COVER_EDGE)
  if (small.size > MAX_COVER_BYTES) throw new Error('That photo is too large to use as a cover. Try a smaller one.')
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Couldn’t read that photo.'))
    reader.readAsDataURL(small)
  })
}

/** Longest edges tried, in order, when a photo has to fit a size budget. */
const FIT_EDGES = [MAX_EDGE, 1280, 1024, 800, 640, 480]

/**
 * Re-encodes a photo so it is at most `maxBytes`, shrinking it step by step. Throws if even the smallest size is too
 * big (or the browser can't re-encode), so the caller can say so instead of storing something that will be refused.
 */
export async function compressToFit(file: Blob, maxBytes: number): Promise<Blob> {
  let best = file
  for (const edge of FIT_EDGES) {
    best = await compressImage(file, edge)
    if (best.size <= maxBytes) return best
  }
  throw new Error('That photo is too large to store. Try a smaller one.')
}
