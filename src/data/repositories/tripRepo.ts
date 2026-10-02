import { db } from '../db'
import { del, getRole, newId, nowIso, put, requireActor, requireTripAccess } from './shared'
import { addDays, tripLengthDays } from '@/lib/dates'
import { canTransition } from '@/features/trips/tripState'
import { checklistItemSchema, itineraryDaySchema, tripSchema } from '@/types'
import type { ChecklistItem, StoredTripState, Trip } from '@/types'

export type NewTripInput = Pick<
  Trip,
  'title' | 'destinationIds' | 'startDate' | 'endDate' | 'timezone' | 'travellers' | 'budget' | 'interests' | 'planningStyle'
> &
  Partial<Pick<Trip, 'coverImage' | 'copiedFromPublicTripId'>>

const DEFAULT_CHECKLIST: Array<Pick<ChecklistItem, 'label' | 'autoRule'>> = [
  { label: 'Flight booked', autoRule: 'flight_booked' },
  { label: 'Hotel booked', autoRule: 'hotel_booked' },
  { label: 'Activities booked', autoRule: 'activities_booked' },
  { label: 'Passport' },
  { label: 'Visa' },
  { label: 'Travel insurance' },
  { label: 'Currency' },
  { label: 'Packing list' },
]

export const tripRepo = {
  /** Trips the signed-in user owns or collaborates on. */
  async list(): Promise<Trip[]> {
    const me = requireActor()
    const shared = (await db.collaborators.where('userId').equals(me).toArray())
      .filter((c) => c.status === 'accepted')
      .map((c) => c.tripId)
    const trips = await db.trips.filter((t) => t.ownerId === me || shared.includes(t.id)).toArray()
    return trips.sort((a, b) => a.startDate.localeCompare(b.startDate))
  },

  async get(id: string): Promise<Trip | undefined> {
    const trip = await db.trips.get(id)
    if (!trip) return undefined
    await requireTripAccess(id, 'view')
    return trip
  },

  async create(input: NewTripInput): Promise<Trip> {
    const ownerId = requireActor()
    const now = nowIso()
    const trip = tripSchema.parse({
      ...input,
      id: newId('trip'),
      ownerId,
      state: 'draft' satisfies StoredTripState,
      visibility: 'private',
      offlineAvailable: false,
      createdAt: now,
      updatedAt: now,
    })
    await put('trips', db.trips, trip)
    await db.collaborators.put({
      id: newId('collab'), tripId: trip.id, userId: ownerId, role: 'owner', status: 'accepted', invitedBy: ownerId, invitedAt: now,
    })
    for (let i = 0; i < tripLengthDays(trip.startDate, trip.endDate); i++) {
      const day = itineraryDaySchema.parse({
        id: newId('day'), tripId: trip.id, dayNumber: i + 1, date: addDays(trip.startDate, i), destinationId: trip.destinationIds[0],
      })
      await put('days', db.days, day)
    }
    for (const c of DEFAULT_CHECKLIST) {
      await put('checklist', db.checklist, checklistItemSchema.parse({ id: newId('chk'), tripId: trip.id, type: c.autoRule ? 'auto' : 'custom', done: false, ...c }))
    }
    return trip
  },

  async update(id: string, patch: Partial<Omit<Trip, 'id' | 'ownerId' | 'createdAt'>>): Promise<Trip> {
    await requireTripAccess(id, 'edit')
    const current = (await db.trips.get(id))!
    const next = tripSchema.parse({ ...current, ...patch, updatedAt: nowIso() })
    await put('trips', db.trips, next)
    return next
  },

  async transition(id: string, to: StoredTripState): Promise<Trip> {
    await requireTripAccess(id, 'edit')
    const current = (await db.trips.get(id))!
    if (current.state !== to && !canTransition(current.state, to)) {
      throw new Error(`Cannot move a trip from ${current.state} to ${to}`)
    }
    return tripRepo.update(id, { state: to, archivedAt: to === 'archived' ? nowIso() : undefined })
  },

  async remove(id: string): Promise<void> {
    await requireTripAccess(id, 'delete')
    await db.transaction('rw', [db.trips, db.days, db.items, db.bookings, db.memories, db.stories, db.checklist, db.collaborators, db.syncQueue], async () => {
      await db.items.where('tripId').equals(id).delete()
      await db.days.where('tripId').equals(id).delete()
      await db.bookings.where('tripId').equals(id).delete()
      await db.memories.where('tripId').equals(id).delete()
      await db.stories.where('tripId').equals(id).delete()
      await db.checklist.where('tripId').equals(id).delete()
      await db.collaborators.where('tripId').equals(id).delete()
      await del('trips', db.trips, id)
    })
  },

  getRole,
}
