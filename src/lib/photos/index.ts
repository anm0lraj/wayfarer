import { placeholderImage } from '@/lib/placeholder'
import photos from './photos.json'
import { photoPath } from './responsive'

/**
 * Card photos: freely licensed pictures from Wikimedia Commons, chosen by `scripts/curate-photos.mjs`, self-hosted in
 * `public/photos` and credited on /credits. `photos.json` maps a seed id to its file and credit.
 */
export interface PhotoCredit {
  /** Commons file title, e.g. "File:Tanah Lot.jpg". */
  file: string
  title: string
  author: string
  licence: string
  licenceUrl: string
  /** The file's page on Commons. */
  source: string
  width: number
  height: number
}

export const PHOTOS: Record<string, PhotoCredit> = photos

/** The image for a seeded id: its self-hosted photo, or the generated illustration when there is none, so a new fixture never breaks. */
export function img(id: string): string {
  return PHOTOS[id] ? photoPath(id) : placeholderImage(id, '', [16, 9])
}

/** A catalogue photo's credit in the shape found photos use (`PlacePhotoCredit`), for showing it under the picture. */
export function commonsCredit(p: PhotoCredit): { name: string; provider: string; providerUrl: string; photoUrl: string; licence: string } {
  return { name: p.author, provider: 'Wikimedia Commons', providerUrl: 'https://commons.wikimedia.org/', photoUrl: p.source, licence: p.licence }
}
