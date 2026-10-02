import { placeholderImage } from '@/lib/placeholder'
import data from './photos.json'

/** One curated photo from Wikimedia Commons, with what the licence needs us to show. */
export interface StockPhoto {
  /** File name on Commons, e.g. "Tanah Lot Temple.jpg". */
  title: string
  /** `<h>/<hh>/<File_name.jpg>` — the folder part of the Commons thumbnail URL. */
  path: string
  width: number
  height: number
  license: string
  licenseUrl: string
  author: string
  /** The photo's page on Commons. */
  page: string
}

const photos = data.photos as Record<string, StockPhoto>
const aliases = data.aliases as Record<string, string>

const BASE = 'https://upload.wikimedia.org/wikipedia/commons/thumb'
/** Thumbnail widths Commons serves. 960 is plenty for cards; heroes get 1280. */
const CARD_W = 960
const HERO_W = 1280

const resolve = (seed: string): StockPhoto | undefined => photos[seed] ?? photos[aliases[seed] ?? '']

/** Destination photos, trip covers and public-trip covers are shown large. */
const isHero = (seed: string) => seed in aliases || !/^(p|r|g|j|h)-|^goa-\d$/.test(seed)

/**
 * A real photograph for a seed id (a place, destination, hotel photo…), served from Wikimedia Commons.
 * The seed rides along in the URL fragment (`#s=`) so that if the image can't load — offline on first visit, blocked
 * network — `installImageFallback` can swap in the generated illustration instead of a broken icon. Seeds without a
 * curated photo get the illustration directly.
 */
export function photoUrl(seed: string, label = ''): string {
  const p = resolve(seed)
  if (!p) return placeholderImage(seed, label, [16, 9])
  return `${thumbUrl(p, isHero(seed) ? HERO_W : CARD_W)}#s=${encodeURIComponent(seed)}`
}

/** Commons thumbnail URL. The width must be one of the sizes Commons serves (250, 500, 960, 1280…). */
export function thumbUrl(p: StockPhoto, width: number): string {
  return `${BASE}/${p.path}/${width}px-${p.path.split('/').pop()}`
}

/** Every distinct curated photo, for the credits page. */
export function allPhotos(): StockPhoto[] {
  return [...new Map(Object.values(photos).map((p) => [p.title, p])).values()].sort((a, b) => a.title.localeCompare(b.title))
}

export const STOCK_HOST = 'upload.wikimedia.org'
