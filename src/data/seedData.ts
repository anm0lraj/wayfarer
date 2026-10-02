import { DEMO_USER_ID } from './actor'
import {
  baliChecklist, baliDays, baliFlights, baliHotels, baliItems, baliPlaces, baliTrip, bali, BALI_TRIP_ID,
} from '@/mocks/fixtures/bali'
import {
  buildPublicTrips, demoNotifications, demoUser, goaChecklist, goaDays, goaItems, goaMemories, goaStories, goaTrip, GOA_TRIP_ID,
  otherDestinations, otherPlaces,
} from '@/mocks/fixtures/others'
import {
  aiConversationSchema, bookingSchema, checklistItemSchema, destinationSchema, flightSchema, hotelSchema, itineraryDaySchema,
  itineraryItemSchema, memorySchema, notificationSchema, placeSchema, publicTripSchema, storySchema, tripSchema, userSchema,
} from '@/types'


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
    stories: goaStories.map((st) => storySchema.parse(st)),
    publicTrips: buildPublicTrips(places).map((p) => publicTripSchema.parse(p)),
    notifications: demoNotifications.map((n) => notificationSchema.parse(n)),
    collaborators: [ownerLink(BALI_TRIP_ID), ownerLink(GOA_TRIP_ID)],
    aiConversations: [aiConversationSchema.parse({ id: 'conv-bali', userId: DEMO_USER_ID, tripId: BALI_TRIP_ID, title: 'Bali trip ideas', createdAt: baliTrip.createdAt })],
  }
}

