import { describe, expect, it } from 'vitest'
import { searchTransit } from '@/data/transit'
import { bookingSchema } from '@/types'
import { parseTransitParams, sortServices, transitBookingInput, transitDefaults } from './transit'

const bali = { destinationIds: ['bali'], startDate: '2026-10-12', travellers: { group: 'couple' as const, count: 2 } }
const jaipur = { destinationIds: ['jaipur'], startDate: '2026-03-06', travellers: { group: 'friends' as const, count: 4 } }
const parse = (qs: string, trip = bali) => parseTransitParams(new URLSearchParams(qs), trip)

describe('transit search URL', () => {
  it('defaults to the trip’s first destination, from where trips there usually start', () => {
    expect(transitDefaults(bali)).toEqual({ from: 'surabaya', to: 'bali', date: '2026-10-12', travellers: 2 })
    expect(transitDefaults(jaipur)).toMatchObject({ from: 'delhi', to: 'jaipur', date: '2026-03-06', travellers: 4 })
    expect(parse('')).toEqual({ from: 'surabaya', to: 'bali', date: '2026-10-12', travellers: 2, sort: 'departure' })
  })

  it('reads from, to, date, travellers and sort', () => {
    expect(parse('from=delhi&to=manali&date=2026-11-02&travellers=3&sort=price')).toEqual({ from: 'delhi', to: 'manali', date: '2026-11-02', travellers: 3, sort: 'price' })
  })

  it('ignores values it does not understand', () => {
    expect(parse('from=atlantis&to=&date=tomorrow&travellers=0&sort=cheapest')).toEqual(parse(''))
    expect(parse('travellers=99').travellers).toBe(2)
    expect(parse('travellers=2.9').travellers).toBe(2)
  })

  it('falls back to a known city for a destination the timetable has not heard of', () => {
    const d = transitDefaults({ ...bali, destinationIds: ['atlantis'] })
    expect(d.to).not.toBe(d.from)
  })
})

describe('sortServices', () => {
  const list = searchTransit('bus', 'delhi', 'jaipur', '2026-10-12')
  it('sorts by departure, price or duration without touching the input', () => {
    const before = list.map((s) => s.id)
    expect(sortServices(list, 'price').map((s) => s.price.amount)).toEqual([...list.map((s) => s.price.amount)].sort((a, b) => a - b))
    expect(sortServices(list, 'duration')[0]!.durationMin).toBe(Math.min(...list.map((s) => s.durationMin)))
    expect(sortServices(list, 'departure').map((s) => s.departAt.slice(11, 16))).toEqual([...list.map((s) => s.departAt.slice(11, 16))].sort())
    expect(list.map((s) => s.id)).toEqual(before)
  })
})

describe('transitBookingInput', () => {
  it('prices the whole party and keeps typed details that the booking schema accepts', () => {
    const [s] = searchTransit('train', 'delhi', 'jaipur', '2026-10-12')
    const input = transitBookingInput(s!, 'trip-1', 3)
    expect(input).toMatchObject({ type: 'train', refId: s!.id, price: { amount: s!.price.amount * 3, currency: 'INR' }, startAt: s!.departAt, endAt: s!.arriveAt })
    expect(input.details).toMatchObject({ serviceId: s!.id, travellers: 3, pricePerPerson: s!.price, seatClass: s!.seatClass })
    const now = '2026-10-01T00:00:00.000Z'
    expect(bookingSchema.safeParse({ ...input, id: 'bk-1', provider: 'Demo provider', status: 'saved', mode: 'demo', createdAt: now, updatedAt: now }).success).toBe(true)
  })
})
