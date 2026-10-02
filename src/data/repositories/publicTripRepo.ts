import { db } from '../db'
import { newId, nowIso, put, requireActor, requireTripAccess } from './shared'
import { itineraryRepo } from './itineraryRepo'
import { tripRepo } from './tripRepo'
import { publicTripSchema, savedPlaceSchema, savedTripSchema } from '@/types'
import type { PublicTrip, SavedPlace, SavedTrip, Trip } from '@/types'
import { tripLengthDays } from '@/lib/dates'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const publicTripRepo = {
  /** Cursor pagination, newest first. Feed screens (Phase 7) use this with infinite scroll. */
  async listPage(cursor: string | null, limit = 12): Promise<{ items: PublicTrip[]; nextCursor: string | null }> {
    const all = (await db.publicTrips.toArray()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    const start = cursor ? all.findIndex((t) => t.id === cursor) + 1 : 0
    const items = all.slice(start, start + limit)
    return { items, nextCursor: start + limit < all.length ? items[items.length - 1]!.id : null }
  },

  getBySlug: (slug: string): Promise<PublicTrip | undefined> => db.publicTrips.where('slug').equals(slug).first(),

  /**
   * Publishes a sanitised snapshot of the trip. Private notes, booking links and exact memory
   * locations never enter the snapshot. Visibility 'private' removes the public record.
   */
  async publish(tripId: string, opts: { description: string; visibility: 'link' | 'public'; tips?: string[] }): Promise<PublicTrip> {
    await requireTripAccess(tripId, 'publish')
    const trip = (await db.trips.get(tripId))!
    const [days, items, memories] = await Promise.all([
      itineraryRepo.listDays(tripId), itineraryRepo.listItems(tripId), db.memories.where('tripId').equals(tripId).toArray(),
    ])
    const placeIds = [...new Set(items.map((i) => i.placeId).filter((x): x is string => !!x))]
    const places = (await db.places.bulkGet(placeIds)).filter((p) => !!p)
    const dayNumberById = new Map(days.map((d) => [d.id, d.dayNumber]))
    const user = await db.users.get(requireActor())
    const existing = trip.publicTripId ? await db.publicTrips.get(trip.publicTripId) : undefined
    const total = trip.budget.total?.amount ?? 0
    const publicTrip = publicTripSchema.parse({
      id: existing?.id ?? newId('pub'),
      slug: existing?.slug ?? `${slugify(trip.title)}-${newId('').slice(1, 5).toLowerCase()}`,
      tripId, ownerId: trip.ownerId, ownerName: user?.name ?? 'Traveller',
      title: trip.title, description: opts.description, coverImage: trip.coverImage ?? '',
      destinationIds: trip.destinationIds, durationDays: tripLengthDays(trip.startDate, trip.endDate),
      budgetRange: [{ amount: Math.round(total * 0.85), currency: trip.budget.total?.currency ?? 'INR' }, { amount: Math.round(total * 1.15), currency: trip.budget.total?.currency ?? 'INR' }],
      travelStyle: trip.budget.tier, tips: opts.tips ?? [],
      snapshot: {
        days,
        items: items.map(({ notes: _n, bookingId: _b, ...rest }) => rest),
        places,
        memories: memories
          .filter((m) => m.kind === 'photo' && m.mediaKey && m.uploadState === 'done')
          .map((m) => ({ id: m.id, caption: m.caption, mediaUrl: m.mediaKey!, dayNumber: m.dayId ? dayNumberById.get(m.dayId) : undefined })),
      },
      likeCount: existing?.likeCount ?? 0, saveCount: existing?.saveCount ?? 0, publishedAt: existing?.publishedAt ?? nowIso(),
    })
    await put('publicTrips', db.publicTrips, publicTrip)
    await tripRepo.update(tripId, { visibility: opts.visibility, publicTripId: publicTrip.id })
    return publicTrip
  },

  async unpublish(tripId: string): Promise<void> {
    await requireTripAccess(tripId, 'publish')
    const trip = (await db.trips.get(tripId))!
    if (trip.publicTripId) await db.publicTrips.delete(trip.publicTripId)
    await tripRepo.update(tripId, { visibility: 'private', publicTripId: undefined })
  },

  /** "Use This Itinerary": copies a public itinerary into a new trip owned by the signed-in user. Never edits the original. */
  async useItinerary(publicTripId: string, dates: { startDate: string; endDate: string }): Promise<Trip> {
    const pub = await db.publicTrips.get(publicTripId)
    if (!pub) throw new Error('Itinerary not found')
    const dest = await db.destinations.get(pub.destinationIds[0] ?? '')
    const trip = await tripRepo.create({
      title: `${pub.title} (copy)`, destinationIds: pub.destinationIds, ...dates, timezone: dest?.timezone ?? 'UTC',
      travellers: { group: 'couple', count: 2 }, budget: { tier: 'comfort' }, interests: [], planningStyle: 'hybrid',
      coverImage: pub.coverImage, copiedFromPublicTripId: pub.id,
    })
    const days = await itineraryRepo.listDays(trip.id)
    for (const src of pub.snapshot.days) {
      const target = days.find((d) => d.dayNumber === src.dayNumber)
      if (!target) continue
      await itineraryRepo.updateDay(target.id, { title: src.title })
      const items = pub.snapshot.items.filter((i) => i.dayId === src.id).sort((a, b) => a.position - b.position)
      for (const it of items) {
        await itineraryRepo.addItem(trip.id, target.id, {
          title: it.title, startTime: it.startTime, durationMin: it.durationMin, category: it.category, placeId: it.placeId,
          description: it.description, estimatedCost: it.estimatedCost, customLocation: it.customLocation, source: 'template', image: it.image,
        })
      }
    }
    return trip
  },
}

export const savedPlaceRepo = {
  async list(): Promise<SavedPlace[]> {
    return db.savedPlaces.where('userId').equals(requireActor()).toArray()
  },
  /** Toggles the bookmark; returns whether the place is saved afterwards. */
  async toggle(placeId: string): Promise<boolean> {
    const userId = requireActor()
    const id = `sp_${userId}_${placeId}`
    if (await db.savedPlaces.get(id)) {
      await db.savedPlaces.delete(id)
      return false
    }
    await put('savedPlaces', db.savedPlaces, savedPlaceSchema.parse({ id, userId, placeId, savedAt: nowIso() }))
    return true
  },
}

export const savedRepo = {
  async list(): Promise<SavedTrip[]> {
    return db.savedTrips.where('userId').equals(requireActor()).toArray()
  },
  async save(publicTripId: string): Promise<SavedTrip> {
    const userId = requireActor()
    const existing = (await db.savedTrips.where('userId').equals(userId).toArray()).find((s) => s.publicTripId === publicTripId)
    if (existing) return existing
    const saved = savedTripSchema.parse({ id: newId('sv'), userId, publicTripId, savedAt: nowIso() })
    await put('savedTrips', db.savedTrips, saved)
    const pub = await db.publicTrips.get(publicTripId)
    if (pub) await db.publicTrips.update(pub.id, { saveCount: pub.saveCount + 1 })
    return saved
  },
  async unsave(publicTripId: string): Promise<void> {
    const existing = (await savedRepo.list()).find((s) => s.publicTripId === publicTripId)
    if (!existing) return
    await db.savedTrips.delete(existing.id)
    const pub = await db.publicTrips.get(publicTripId)
    if (pub) await db.publicTrips.update(pub.id, { saveCount: Math.max(0, pub.saveCount - 1) })
  },
}
