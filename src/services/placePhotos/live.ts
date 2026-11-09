import { z } from 'zod'
import { placePhotoSchema } from '@/types'
import { PlacePhotoError, type PlacePhotoResult, type PlacePhotoService } from './types'

export const PLACE_PHOTOS_PATH = '/api/place-photos'

/** The function's answer: one photo or none. Parsed strictly; an answer that doesn't fit is a failure, never stored. */
const answerSchema = z.object({
  photo: placePhotoSchema.extend({ downloadLocation: z.string().max(600).optional() }).nullable(),
})

export interface LivePlacePhotoOptions {
  /** The signed-in person's Firebase ID token (the real backend only), so the function knows who is asking. */
  getToken?: () => Promise<string | null>
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
const address = (path: string) => new URL(path, globalThis.location?.origin ?? 'http://localhost')

/**
 * Live adapter: asks our own serverless function (`api/place-photos.ts`), which holds the Unsplash key and answers with
 * the photo's address, size, description and credit. The browser never talks to the Unsplash API itself; it only
 * loads the image from Unsplash's CDN, as Unsplash requires (hotlinking).
 */
export function createLivePlacePhotos(options: LivePlacePhotoOptions = {}): PlacePhotoService {
  const headers = async (): Promise<Record<string, string>> => {
    const token = await options.getToken?.().catch(() => null)
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return {
    async search(query, signal) {
      const params = new URLSearchParams({ name: query.name.trim().slice(0, 100) })
      if (query.area?.trim()) params.set('area', query.area.trim().slice(0, 80))
      let res: Response
      try {
        res = await fetch(address(`${PLACE_PHOTOS_PATH}?${params}`), { headers: await headers(), signal })
      } catch (e) {
        if (isAbort(e) || signal?.aborted) throw e
        throw new PlacePhotoError('Network unavailable', true)
      }
      if (!res.ok) throw new PlacePhotoError(`Photo search failed (${res.status})`, false)
      const parsed = answerSchema.safeParse(await res.json().catch(() => undefined))
      if (!parsed.success) throw new PlacePhotoError('Unexpected answer from the photo search', false)
      return parsed.data.photo as PlacePhotoResult | null
    },

    async track(photo) {
      if (!photo.downloadLocation) return
      try {
        await fetch(address(PLACE_PHOTOS_PATH), {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(await headers()) }, body: JSON.stringify({ downloadLocation: photo.downloadLocation }),
        })
      } catch { /* best effort: a missed download event costs nothing but a count */ }
    },
  }
}
