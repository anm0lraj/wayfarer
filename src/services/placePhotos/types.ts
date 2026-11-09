import type { PlacePhoto } from '@/types'

/** What to find a photo of: the place's own name, and the wider area (the trip destination) to tell it apart. */
export interface PlacePhotoQuery {
  name: string
  area?: string
}

/** A found photo. `downloadLocation` is the provider's "this photo was used" endpoint (Unsplash), never stored. */
export interface PlacePhotoResult extends PlacePhoto {
  downloadLocation?: string
}

/**
 * Why a search failed. `retryable` means the network could not be reached (offline): try again on reconnect. Anything
 * else (not configured, refused, provider down) is not retried in this session, so a broken setup never loops.
 */
export class PlacePhotoError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message)
    this.name = 'PlacePhotoError'
  }
}

/** What every place-photo adapter implements. Screens depend on this, never on a vendor. */
export interface PlacePhotoService {
  /** The best photo of the place, or null when nothing suitable exists (the illustration stays). Throws `PlacePhotoError`. */
  search(query: PlacePhotoQuery, signal?: AbortSignal): Promise<PlacePhotoResult | null>
  /** Tells the provider a photo was chosen and stored (Unsplash's download event). Best effort: never throws. */
  track(photo: PlacePhotoResult): Promise<void>
}
