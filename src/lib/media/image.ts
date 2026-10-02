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
export async function compressImage(file: Blob): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function') return file
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
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
