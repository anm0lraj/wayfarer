import { db } from '../db'
import { del, newId, nowIso, put, requireTripAccess } from './shared'
import { bookingSchema } from '@/types'
import type { Booking } from '@/types'

export type NewBookingInput = Pick<Booking, 'tripId' | 'type' | 'provider' | 'title' | 'price' | 'startAt'> &
  Partial<Pick<Booking, 'refId' | 'endAt' | 'details'>>

export const bookingRepo = {
  async list(tripId: string): Promise<Booking[]> {
    await requireTripAccess(tripId, 'view')
    return (await db.bookings.where('tripId').equals(tripId).toArray()).sort((a, b) => a.startAt.localeCompare(b.startAt))
  },

  /**
   * Saves a booking to the trip. Always `status: 'saved'`, `mode: 'demo'` — no real booking API is connected,
   * so nothing here may claim a confirmation. A live provider adapter will add its own path later.
   */
  async saveDemo(input: NewBookingInput): Promise<Booking> {
    await requireTripAccess(input.tripId, 'edit')
    const now = nowIso()
    const booking = bookingSchema.parse({ ...input, id: newId('bk'), status: 'saved', mode: 'demo', details: input.details ?? {}, createdAt: now, updatedAt: now })
    await put('bookings', db.bookings, booking)
    return booking
  },

  async remove(id: string): Promise<void> {
    const b = await db.bookings.get(id)
    if (!b) return
    await requireTripAccess(b.tripId, 'edit')
    await del('bookings', db.bookings, id)
  },
}
