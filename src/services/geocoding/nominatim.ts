import { z } from 'zod'
import type { GeoPoint } from '@/types'
import type { GeocodeResult, GeocodingService } from './types'

/**
 * Place search from OpenStreetMap's Nominatim (https://nominatim.org), called straight from the browser: no key, no account.
 * Its usage policy for the public server: at most one request a second, light use only, and results must credit
 * OpenStreetMap. We send no custom headers (the browser's own Referer identifies the site) and never an email address.
 * Before launch point `BASE` at a geocoder you run or pay for; `GeocodingService` does not change.
 */
const BASE = 'https://nominatim.openstreetmap.org'

/** Gap between the start of one request and the start of the next. */
export const MIN_GAP_MS = 1000
/** The soft bias box around the trip, in degrees each way (about 55 km). */
const VIEWBOX_DEGREES = 0.5

const num = z.union([z.number(), z.string()]).pipe(z.coerce.number().finite())
const rowSchema = z.object({
  place_id: z.union([z.number(), z.string()]),
  lat: num.pipe(z.number().min(-90).max(90)),
  lon: num.pipe(z.number().min(-180).max(180)),
  display_name: z.string().min(1),
  name: z.string().optional(),
})
type Row = z.infer<typeof rowSchema>

const toResult = (r: Row): GeocodeResult => ({
  id: `osm:${r.place_id}`,
  name: r.name?.trim() || r.display_name.split(',')[0]!.trim(),
  address: r.display_name,
  point: { lat: r.lat, lng: r.lon },
})

/** Keeps the rows that parse and drops the rest (one odd row should not hide the others). */
export function parseRows(data: unknown): GeocodeResult[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((row) => {
    const parsed = rowSchema.safeParse(row)
    return parsed.success ? [toResult(parsed.data)] : []
  })
}

const aborted = () => new DOMException('Aborted', 'AbortError')

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted())
    const onAbort = () => { clearTimeout(timer); reject(aborted()) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface NominatimOptions {
  /** Defaults to the global `fetch` at call time (so tests can stub it). */
  fetch?: typeof fetch
  /** Language for result names; defaults to the browser's. */
  language?: () => string
  minGapMs?: number
}

export function createNominatim(options: NominatimOptions = {}): GeocodingService {
  const gap = options.minGapMs ?? MIN_GAP_MS
  const language = options.language ?? (() => (typeof navigator !== 'undefined' && navigator.language) || 'en')
  let tail: Promise<unknown> = Promise.resolve()
  let lastStart = -Infinity

  /** One queue for every request: they leave one after another, `gap` apart, and a cancelled one is never sent. */
  function enqueue<T>(job: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const run = tail.then(async () => {
      if (signal?.aborted) throw aborted()
      const wait = lastStart + gap - Date.now()
      if (wait > 0) await sleep(wait, signal)
      if (signal?.aborted) throw aborted()
      lastStart = Date.now()
      return job()
    })
    tail = run.catch(() => undefined)
    return run
  }

  async function get(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
    const res = await (options.fetch ?? fetch)(`${BASE}${path}?${params}`, { signal })
    if (!res.ok) throw new Error(`Place search unavailable (${res.status})`)
    return res.json()
  }

  return {
    attribution: 'Search by OpenStreetMap Nominatim · © OpenStreetMap contributors',

    search(query, near, signal) {
      const q = query.trim()
      if (!q) return Promise.resolve([])
      const params = new URLSearchParams({ q, format: 'jsonv2', limit: '5', 'accept-language': language() })
      // A soft bias only (no `bounded`): people may search for a stop outside the trip area.
      if (near) params.set('viewbox', [near.lng - VIEWBOX_DEGREES, near.lat + VIEWBOX_DEGREES, near.lng + VIEWBOX_DEGREES, near.lat - VIEWBOX_DEGREES].map((n) => n.toFixed(4)).join(','))
      return enqueue(async () => parseRows(await get('/search', params, signal)), signal)
    },

    reverse(point: GeoPoint, signal) {
      const params = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng), format: 'jsonv2', zoom: '18', 'accept-language': language() })
      return enqueue(async () => {
        const parsed = rowSchema.safeParse(await get('/reverse', params, signal)) // an unknown spot answers {"error": "Unable to geocode"}
        return parsed.success ? { ...toResult(parsed.data), point } : undefined
      }, signal)
    },
  }
}

export const nominatimGeocoding = createNominatim()
