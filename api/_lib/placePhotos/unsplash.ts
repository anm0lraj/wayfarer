import { z } from 'zod'
import { HttpError } from '../ai/http.js'

/**
 * Photo search for places that have no catalogue photo, through the Unsplash API (server side, so the key never
 * reaches the browser). Unsplash's API guidelines, followed here:
 *  - images are hotlinked from `images.unsplash.com` using the `urls.raw` address it returns (we only add size/format
 *    parameters), never copied;
 *  - every photo is credited "Photo by <name> on Unsplash", both linked, with `utm_source=<app name>&utm_medium=referral`;
 *  - when the app stores a photo for a record, its `links.download_location` is called (the `download` action below).
 * Settings (server-side only, never VITE_): `UNSPLASH_ACCESS_KEY` (a Vercel *Sensitive* variable) and
 * `UNSPLASH_APP_NAME` (the app's name at Unsplash, used in the credit links; default `travel_planner_app`).
 */
export const API_BASE = () => process.env.UNSPLASH_API_URL ?? 'https://api.unsplash.com'
export const accessKey = () => process.env.UNSPLASH_ACCESS_KEY?.trim() || undefined
export const appName = () => (process.env.UNSPLASH_APP_NAME?.trim() || 'travel_planner_app').replace(/[^A-Za-z0-9_-]/g, '_')

/** What the app may ask: a place name and, optionally, the area it is in. Short, plain text only. */
export const searchInput = z.object({
  name: z.string().trim().min(2).max(100),
  area: z.string().trim().max(80).optional(),
})
export type SearchInput = z.infer<typeof searchInput>

/** The download event: only Unsplash's own endpoint for one photo, so the function can't be used to call anything else. */
export const DOWNLOAD_LOCATION = /^https:\/\/api\.unsplash\.com\/photos\/[A-Za-z0-9_-]{1,64}\/download(\?[A-Za-z0-9_=&%.-]{0,400})?$/
export const downloadInput = z.object({ downloadLocation: z.string().max(600).regex(DOWNLOAD_LOCATION) })

const unsplashPhoto = z.object({
  id: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt_description: z.string().nullish(),
  description: z.string().nullish(),
  urls: z.object({ raw: z.string().regex(/^https:\/\/images\.unsplash\.com\/[^\s"'<>]+$/) }),
  links: z.object({ html: z.string().regex(/^https:\/\/unsplash\.com\/[^\s"'<>]*$/), download_location: z.string().regex(DOWNLOAD_LOCATION) }),
  user: z.object({ name: z.string().min(1), links: z.object({ html: z.string().regex(/^https:\/\/unsplash\.com\/[^\s"'<>]*$/) }) }),
})
type UnsplashPhoto = z.infer<typeof unsplashPhoto>

export interface FoundPhoto {
  url: string
  width: number
  height: number
  alt: string
  credit: { name: string; profileUrl: string; provider: 'Unsplash'; providerUrl: string; photoUrl: string }
  downloadLocation: string
}

/** Adds the referral parameters Unsplash asks for to one of its links. */
export function withUtm(link: string): string {
  const u = new URL(link)
  u.searchParams.set('utm_source', appName())
  u.searchParams.set('utm_medium', 'referral')
  return u.toString()
}

/** The 1280 px WebP rendition of a raw image address (the app derives 640 px from it the same way). */
export function sized(raw: string, width = 1280): string {
  const u = new URL(raw)
  u.searchParams.set('w', String(width))
  u.searchParams.set('fm', 'webp')
  u.searchParams.set('q', '60')
  u.searchParams.set('fit', 'max')
  return u.toString()
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function toFound(p: UnsplashPhoto, input: SearchInput): FoundPhoto {
  const width = Math.min(1280, p.width)
  return {
    url: sized(p.urls.raw), width, height: Math.max(1, Math.round((width * p.height) / p.width)),
    alt: clip(p.alt_description?.trim() || p.description?.trim() || input.name, 300),
    credit: {
      name: clip(p.user.name.trim(), 120), profileUrl: withUtm(p.user.links.html), provider: 'Unsplash',
      providerUrl: withUtm('https://unsplash.com/'), photoUrl: withUtm(p.links.html),
    },
    downloadLocation: p.links.download_location,
  }
}

/** The first result that parses and is wider than tall (cards are landscape); null when none is suitable. */
export function pickPhoto(body: unknown, input: SearchInput): FoundPhoto | null {
  const results = (body as { results?: unknown } | null)?.results
  if (!Array.isArray(results)) return null
  for (const r of results) {
    const p = unsplashPhoto.safeParse(r)
    if (p.success && p.data.width >= p.data.height) return toFound(p.data, input)
  }
  return null
}

/** Turns an Unsplash refusal into our own answer; the provider's details only go to the log. */
function providerFailure(status: number): HttpError {
  console.error('Unsplash refused', { status })
  if (status === 401 || status === 403) return new HttpError(502, 'provider_auth') // wrong key, or the hourly limit (403 "Rate Limit Exceeded")
  if (status === 429) return new HttpError(503, 'rate_limited')
  return new HttpError(502, 'provider_error')
}

const headers = (key: string) => ({ Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' })

/** One search, one photo. Throws HttpError for anything the app should treat as "not now". */
export async function searchUnsplash(key: string, input: SearchInput, signal?: AbortSignal): Promise<FoundPhoto | null> {
  const query = [input.name, input.area].filter(Boolean).join(' ')
  const url = `${API_BASE()}/search/photos?${new URLSearchParams({ query, per_page: '5', orientation: 'landscape', content_filter: 'high' })}`
  let res: Response
  try {
    res = await fetch(url, { headers: headers(key), signal: signal ?? AbortSignal.timeout(8000) })
  } catch {
    throw new HttpError(504, 'provider_unreachable')
  }
  if (!res.ok) throw providerFailure(res.status)
  return pickPhoto(await res.json().catch(() => null), input)
}

/** Unsplash's download event for a photo the app stored. */
export async function trackDownload(key: string, downloadLocation: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(downloadLocation, { headers: headers(key), signal: AbortSignal.timeout(8000) })
  } catch {
    throw new HttpError(504, 'provider_unreachable')
  }
  if (!res.ok) throw providerFailure(res.status)
}

/**
 * A small per-instance memory of recent answers, so the same place asked by several people (or twice) costs one
 * Unsplash request while the function instance is warm. Demo keys allow 50 requests an hour.
 */
const MAX_CACHED = 300
const TTL_MS = 6 * 3_600_000
const cache = new Map<string, { at: number; photo: FoundPhoto | null }>()
export const cacheKey = (i: SearchInput) => `${i.name.toLowerCase()}|${(i.area ?? '').toLowerCase()}`
export function cached(i: SearchInput, now = Date.now()): { photo: FoundPhoto | null } | undefined {
  const hit = cache.get(cacheKey(i))
  return hit && now - hit.at < TTL_MS ? { photo: hit.photo } : undefined
}
export function remember(i: SearchInput, photo: FoundPhoto | null, now = Date.now()) {
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string)
  cache.set(cacheKey(i), { at: now, photo })
}
export const clearCache = () => cache.clear()
