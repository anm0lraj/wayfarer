import type { QueryClient } from '@tanstack/react-query'
import { db } from '@/data/db'
import { catalogRepo, itineraryRepo } from '@/data/repositories'
import { getRole } from '@/data/repositories/shared'
import { can } from '@/lib/permissions'
import { photoIdOf } from '@/lib/photos/responsive'
import { PlacePhotoError, type PlacePhotoQuery, type PlacePhotoResult, type PlacePhotoService } from '@/services/placePhotos/types'
import type { ItemCategory, ItineraryDay, ItineraryItem } from '@/types'

/**
 * Automatic photos for custom places (an activity whose pin was chosen by search or on the map, so it has no catalogue
 * photo). Each such stop is searched once, in the background after it is saved: the photo (or "nothing suitable") is
 * stored on the item as `autoPhoto`, so it syncs to the traveller's other devices and is never searched again unless
 * the place changes. Failures are not stored: offline waits for the next reconnect, any other failure waits for the
 * next app start (never a loop).
 */

/** Stops where a stock photo would mislead or say nothing (a taxi, a hotel we can't picture, free time). */
const SKIP: ReadonlySet<ItemCategory> = new Set(['transport', 'lodging', 'free_time'])

export interface PhotoQuery extends PlacePhotoQuery {
  /** Stored on the item: the search it answered. Compared case-insensitively. */
  key: string
}

/** What to search for this stop, or undefined when it should not get an automatic photo. */
export function photoQueryFor(item: ItineraryItem, area: string | undefined): PhotoQuery | undefined {
  if (item.placeId || !item.customLocation || SKIP.has(item.category)) return undefined
  if (photoIdOf(item.image) || item.image?.startsWith('https://')) return undefined // it already has a real photo
  const name = item.customLocation.name.trim()
  if (name.length < 2) return undefined
  const a = area?.trim() || undefined
  return { name, area: a, key: (a && !name.toLowerCase().includes(a.toLowerCase()) ? `${name}, ${a}` : name).slice(0, 200) }
}

const same = (a: string | undefined, b: string) => !!a && a.toLowerCase() === b.toLowerCase()

/** True when the stop needs a search now (never searched, or its place changed since). */
export function needsSearch(item: ItineraryItem, q: PhotoQuery | undefined): q is PhotoQuery {
  return !!q && !same(item.autoPhoto?.query, q.key)
}

/** Searches that failed this session (not offline): not retried until the app is opened again. */
const failed = new Set<string>()
/** Test hook. */
export const resetAutoPhotoFailures = () => failed.clear()

const queryKey = (q: PhotoQuery) => ['place-photo', q.key.toLowerCase()] as const

/**
 * One search per place per session, through TanStack Query: a second stop at the same place, a second tab render or a
 * re-run after an edit reuses the answer instead of asking the provider again.
 */
async function searchOnce(qc: QueryClient, service: PlacePhotoService, q: PhotoQuery): Promise<PlacePhotoResult | null> {
  return qc.fetchQuery({
    queryKey: queryKey(q), staleTime: Infinity, gcTime: Infinity, retry: false,
    queryFn: ({ signal }) => service.search({ name: q.name, area: q.area }, signal),
  })
}

export interface AttachOptions {
  tripId: string
  service: PlacePhotoService
  qc: QueryClient
  /** Defaults to `navigator.onLine`. */
  online?: () => boolean
}

async function areaFinder(tripId: string, days: ItineraryDay[]) {
  const trip = await db.trips.get(tripId)
  const names = new Map<string, string | undefined>()
  const nameOf = async (id: string | undefined) => {
    if (!id) return undefined
    if (!names.has(id)) names.set(id, (await catalogRepo.getDestination(id))?.name)
    return names.get(id)
  }
  const dayDest = new Map(days.map((d) => [d.id, d.destinationId]))
  return (item: ItineraryItem) => nameOf(dayDest.get(item.dayId) ?? trip?.destinationIds[0])
}

/**
 * Finds photos for the trip's custom stops that need one and stores them. Returns how many items changed. Only for
 * people who may edit the trip (a viewer's device never writes). Sequential and gentle: one search at a time.
 */
export async function attachPlacePhotos({ tripId, service, qc, online = () => navigator.onLine }: AttachOptions): Promise<number> {
  if (!can(await getRole(tripId), 'edit')) return 0
  const [days, items] = await Promise.all([itineraryRepo.listDays(tripId), itineraryRepo.listItems(tripId)])
  const areaOf = await areaFinder(tripId, days)
  let changed = 0
  for (const item of items) {
    const q = photoQueryFor(item, await areaOf(item))
    if (!q) {
      // The place was cleared or became a catalogue stop: an old automatic photo no longer belongs to it.
      if (item.autoPhoto && !item.placeId && !item.customLocation) { await itineraryRepo.updateItem(item.id, { autoPhoto: undefined }); changed++ }
      continue
    }
    if (!needsSearch(item, q) || failed.has(q.key.toLowerCase())) continue
    if (!online()) break
    let result: PlacePhotoResult | null
    try {
      result = await searchOnce(qc, service, q)
    } catch (e) {
      if (e instanceof PlacePhotoError && e.retryable) break // offline after all: try again on reconnect
      failed.add(q.key.toLowerCase())
      continue
    }
    if (await store(item.id, q, result)) {
      changed++
      if (result) void service.track(result)
    }
  }
  if (changed) await qc.invalidateQueries({ queryKey: ['trips', tripId, 'plan'] })
  return changed
}

/** Writes the answer if the stop still is the same place (it may have been edited or deleted while we searched). */
async function store(itemId: string, q: PhotoQuery, result: PlacePhotoResult | null): Promise<boolean> {
  const current = await db.items.get(itemId)
  if (!current || current.placeId || !current.customLocation || current.customLocation.name.trim() !== q.name) return false
  if (same(current.autoPhoto?.query, q.key)) return false
  const photo = result ? (({ downloadLocation: _d, ...p }) => p)(result) : undefined
  try {
    await itineraryRepo.updateItem(itemId, { autoPhoto: { query: q.key, photo } })
    return true
  } catch {
    failed.add(q.key.toLowerCase()) // e.g. a photo the schema refuses: keep the illustration, don't ask again
    return false
  }
}

/** One pass at a time per trip; a request during a pass asks for one more pass after it. */
const running = new Map<string, { again: boolean; done: Promise<void> }>()
export function schedulePlacePhotos(opts: AttachOptions): Promise<void> {
  const current = running.get(opts.tripId)
  if (current) { current.again = true; return current.done }
  const state = { again: false, done: Promise.resolve() }
  state.done = (async () => {
    try {
      do {
        state.again = false
        await attachPlacePhotos(opts).catch(() => undefined) // never surfaces: the illustration is a fine answer
      } while (state.again)
    } finally {
      running.delete(opts.tripId)
    }
  })()
  running.set(opts.tripId, state)
  return state.done
}
