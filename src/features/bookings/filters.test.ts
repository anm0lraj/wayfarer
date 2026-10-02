import { describe, expect, it } from 'vitest'
import { zonedIso } from '@/lib/dates'
import { activeFilterCount, nightsBetween, parseHotelSearch, serializeHotelSearch, stayTotal, validStay } from './filters'
import { flightDefaults } from './flights'

const trip = { startDate: '2026-10-12', endDate: '2026-10-16', travellers: { group: 'couple' as const, count: 2 }, destinationIds: ['bali'] }

describe('hotel search URL', () => {
  it('falls back to the trip dates and party size', () => {
    const s = parseHotelSearch(new URLSearchParams(), trip)
    expect(s).toMatchObject({ checkIn: '2026-10-12', checkOut: '2026-10-16', guests: 2, amenities: [], sort: 'recommended' })
  })

  it('round-trips filters and writes nothing for defaults', () => {
    expect(serializeHotelSearch(parseHotelSearch(new URLSearchParams(), trip), trip).toString()).toBe('')
    const s = parseHotelSearch(new URLSearchParams('maxPrice=5000&amenities=Pool,Spa&types=Villa&sort=price&guests=3'), trip)
    expect(s).toMatchObject({ maxPrice: 5000, amenities: ['Pool', 'Spa'], propertyTypes: ['Villa'], sort: 'price', guests: 3 })
    expect(parseHotelSearch(serializeHotelSearch(s, trip), trip)).toEqual(s)
    expect(activeFilterCount(s)).toBe(4)
  })

  it('ignores junk values', () => {
    const s = parseHotelSearch(new URLSearchParams('maxPrice=abc&guests=-2&sort=weird'), trip)
    expect(s).toMatchObject({ maxPrice: undefined, guests: 2, sort: 'recommended' })
  })

  it('counts nights and totals, and rejects an inverted stay', () => {
    expect(nightsBetween('2026-10-12', '2026-10-16')).toBe(4)
    expect(stayTotal({ amount: 100, currency: 'INR' }, 3).amount).toBe(300)
    expect(validStay({ checkIn: '2026-10-16', checkOut: '2026-10-12' })).toBe(false)
    expect(validStay({ checkIn: '2026-10-12', checkOut: '2026-10-12' })).toBe(false)
  })
})

describe('flight defaults', () => {
  it('searches outbound on day 1 and return on the last day', () => {
    expect(flightDefaults(trip, 'outbound')).toEqual({ from: 'BOM', to: 'DPS', date: '2026-10-12' })
    expect(flightDefaults(trip, 'return')).toEqual({ from: 'DPS', to: 'BOM', date: '2026-10-16' })
  })
})

describe('zonedIso', () => {
  it('converts a wall-clock time in a timezone to UTC', () => {
    expect(zonedIso('2026-10-12', '14:00', 'Asia/Makassar')).toBe('2026-10-12T06:00:00.000Z')
    expect(zonedIso('2026-10-12', '09:30', 'Asia/Kolkata')).toBe('2026-10-12T04:00:00.000Z')
    expect(zonedIso('2026-01-15', '12:00', 'America/New_York')).toBe('2026-01-15T17:00:00.000Z')
  })
})
