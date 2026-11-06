import { describe, expect, it } from 'vitest'
import { searchTransit } from '@/data/transit'
import { transitBookingInput } from '@/features/bookings/transit'
import { bookingSchema, transitServiceSchema } from './booking'

const now = '2026-10-01T00:00:00.000Z'
const [train] = searchTransit('train', 'delhi', 'jaipur', '2026-10-12')
const [bus] = searchTransit('bus', 'bali', 'surabaya', '2026-10-12')
const make = (s = train!, over: Record<string, unknown> = {}) => ({
  ...transitBookingInput(s, 'trip-1', 2), id: 'bk-1', provider: 'Demo provider', status: 'saved', mode: 'demo', createdAt: now, updatedAt: now, ...over,
})

describe('train and bus bookings', () => {
  it('accepts a saved demo train and bus with matching details', () => {
    expect(bookingSchema.safeParse(make()).success).toBe(true)
    expect(bookingSchema.parse(make(bus)).type).toBe('bus')
  })

  it('rejects details that do not match the type', () => {
    expect(bookingSchema.safeParse(make(train, { details: {} })).success).toBe(false)
    expect(bookingSchema.safeParse(make(train, { details: { flightId: 'f-1', travellers: 2 } })).success).toBe(false)
    const d = make().details as Record<string, unknown>
    expect(bookingSchema.safeParse(make(train, { details: { ...d, travellers: 0 } })).success).toBe(false)
    expect(bookingSchema.safeParse(make(train, { details: { ...d, from: { code: 'X' } } })).success).toBe(false)
  })

  it('still rejects a confirmed demo booking', () => {
    expect(bookingSchema.safeParse(make(train, { status: 'confirmed' })).success).toBe(false)
    expect(bookingSchema.safeParse(make(bus, { status: 'confirmed' })).success).toBe(false)
    // A live booking is a different path (a real provider adapter) and is not blocked by the demo guard.
    expect(bookingSchema.safeParse(make(train, { mode: 'live', status: 'confirmed' })).success).toBe(true)
  })

  it('leaves other booking types’ free-form details alone', () => {
    expect(bookingSchema.safeParse({ ...make(), type: 'flight', details: { flightId: 'f-1' } }).success).toBe(true)
  })

  it('validates a search result', () => {
    expect(transitServiceSchema.safeParse(train).success).toBe(true)
    expect(transitServiceSchema.safeParse({ ...train, durationMin: 0 }).success).toBe(false)
    expect(transitServiceSchema.safeParse({ ...train, departAt: '2026-10-12T06:05:00' }).success).toBe(false)
  })
})
