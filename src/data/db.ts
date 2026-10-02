import Dexie, { type Table } from 'dexie'
import type {
  AIConversation, AIMessage, Booking, ChecklistItem, Destination, Flight, Hotel, ItineraryDay, ItineraryItem, Memory,
  LikedTrip, Notification, Place, PublicTrip, SavedPlace, SavedTrip, Story, Trip, TripCollaborator, User,
} from '@/types'

export interface SyncOp {
  id?: number
  entity: string
  entityId: string
  op: 'put' | 'delete'
  payload?: unknown
  createdAt: number
  attempts: number
}

export interface BlobRecord {
  key: string
  blob: Blob
  createdAt: number
}

export interface MetaRecord {
  key: string
  value: unknown
}

export class TravelDB extends Dexie {
  users!: Table<User, string>
  destinations!: Table<Destination, string>
  trips!: Table<Trip, string>
  days!: Table<ItineraryDay, string>
  items!: Table<ItineraryItem, string>
  places!: Table<Place, string>
  hotels!: Table<Hotel, string>
  flights!: Table<Flight, string>
  bookings!: Table<Booking, string>
  memories!: Table<Memory, string>
  stories!: Table<Story, string>
  publicTrips!: Table<PublicTrip, string>
  savedTrips!: Table<SavedTrip, string>
  savedPlaces!: Table<SavedPlace, string>
  likedTrips!: Table<LikedTrip, string>
  checklist!: Table<ChecklistItem, string>
  notifications!: Table<Notification, string>
  aiConversations!: Table<AIConversation, string>
  aiMessages!: Table<AIMessage, string>
  collaborators!: Table<TripCollaborator, string>
  syncQueue!: Table<SyncOp, number>
  blobs!: Table<BlobRecord, string>
  meta!: Table<MetaRecord, string>

  constructor(name = 'travel-app') {
    super(name)
    this.version(1).stores({
      users: 'id',
      destinations: 'id, country',
      trips: 'id, ownerId, state, startDate',
      days: 'id, tripId, [tripId+dayNumber]',
      items: 'id, tripId, dayId, [dayId+position]',
      places: 'id, destinationId, kind',
      hotels: 'id, destinationId',
      flights: 'id',
      bookings: 'id, tripId, type',
      memories: 'id, tripId, dayId, uploadState',
      stories: 'id, tripId',
      publicTrips: 'id, &slug, ownerId, publishedAt',
      savedTrips: 'id, userId',
      checklist: 'id, tripId',
      notifications: 'id, userId, scheduledFor',
      aiConversations: 'id, userId, tripId',
      aiMessages: 'id, conversationId',
      collaborators: 'id, tripId, userId, [tripId+userId]',
      syncQueue: '++id, entity, createdAt',
      blobs: 'key',
      meta: 'key',
    })
    // v2: bookmarked places from destination pages.
    this.version(2).stores({ savedPlaces: 'id, userId, placeId' })
    // v3: likes on public itineraries.
    this.version(3).stores({ likedTrips: 'id, userId, publicTripId' })
  }
}

export const db = new TravelDB()
