import type { TravelDB } from './db'
import { db as defaultDb } from './db'
import { DEMO_USER_ID } from './actor'
import {
  baliChecklist, baliDays, baliFlights, baliHotels, baliItems, baliPlaces, baliTrip, bali, BALI_TRIP_ID,
} from '@/mocks/fixtures/bali'
import {
  buildPublicTrips, demoNotifications, demoUser, goaChecklist, goaDays, goaItems, goaMemories, goaTrip, GOA_TRIP_ID,
  otherDestinations, otherPlaces,
} from '@/mocks/fixtures/others'
import {
  aiConversationSchema, bookingSchema, checklistItemSchema, destinationSchema, flightSchema, hotelSchema, itineraryDaySchema,
  itineraryItemSchema, memorySchema, notificationSchema, placeSchema, publicTripSchema, tripSchema, userSchema,
} from '@/types'

const SEED_VERSION = 6

/** All demo data, validated against the Zod schemas so bad fixtures fail loudly. */
export function buildSeed() {
  const places = [...baliPlaces, ...otherPlaces].map((p) => placeSchema.parse(p))
  const ownerLink = (tripId: string) => ({
    id: `collab-${tripId}-owner`, tripId, userId: DEMO_USER_ID, role: 'owner' as const, status: 'accepted' as const, invitedBy: DEMO_USER_ID, invitedAt: baliTrip.createdAt,
  })
  return {
    users: [userSchema.parse(demoUser)],
    destinations: [bali, ...otherDestinations].map((d) => destinationSchema.parse(d)),
    places,
    hotels: baliHotels.map((h) => hotelSchema.parse(h)),
    flights: baliFlights.map((f) => flightSchema.parse(f)),
    trips: [tripSchema.parse(baliTrip), tripSchema.parse(goaTrip)],
    days: [...baliDays, ...goaDays].map((d) => itineraryDaySchema.parse(d)),
    items: [...baliItems, ...goaItems].map((i) => itineraryItemSchema.parse(i)),
    checklist: [...baliChecklist, ...goaChecklist].map((c) => checklistItemSchema.parse(c)),
    bookings: [] as ReturnType<typeof bookingSchema.parse>[], // none: the demo journey adds a hotel and flight itself
    memories: goaMemories.map((m) => memorySchema.parse(m)),
    publicTrips: buildPublicTrips(places).map((p) => publicTripSchema.parse(p)),
    notifications: demoNotifications.map((n) => notificationSchema.parse(n)),
    collaborators: [ownerLink(BALI_TRIP_ID), ownerLink(GOA_TRIP_ID)],
    aiConversations: [aiConversationSchema.parse({ id: 'conv-bali', userId: DEMO_USER_ID, tripId: BALI_TRIP_ID, title: 'Bali trip ideas', createdAt: baliTrip.createdAt })],
  }
}

async function write(db: TravelDB) {
  const s = buildSeed()
  await db.transaction('rw', db.tables, async () => {
    await Promise.all([
      db.users.bulkPut(s.users), db.destinations.bulkPut(s.destinations), db.places.bulkPut(s.places), db.hotels.bulkPut(s.hotels),
      db.flights.bulkPut(s.flights), db.trips.bulkPut(s.trips), db.days.bulkPut(s.days), db.items.bulkPut(s.items),
      db.checklist.bulkPut(s.checklist), db.bookings.bulkPut(s.bookings), db.memories.bulkPut(s.memories),
      db.publicTrips.bulkPut(s.publicTrips), db.notifications.bulkPut(s.notifications), db.collaborators.bulkPut(s.collaborators),
      db.aiConversations.bulkPut(s.aiConversations),
    ])
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
  })
}

/** Seeds the database on first run (or when the seed version changes). Returns true when it wrote data. */
export async function seedIfNeeded(db: TravelDB = defaultDb): Promise<boolean> {
  const current = await db.meta.get('seedVersion')
  if (current?.value === SEED_VERSION) return false
  await write(db)
  return true
}

/** Settings → "Reset demo data": wipes everything (including user-created data and queued writes) and re-seeds. */
export async function resetDemoData(db: TravelDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })
  await write(db)
}
