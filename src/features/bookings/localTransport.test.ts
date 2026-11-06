import { describe, expect, it } from 'vitest'
import { fareTableFor } from '@/data/fares'
import { transitCity } from '@/data/transitCities'
import { fareRangeText, insertStartTime, LOCAL_MAX_KM, localOptionStop, localOptions, minutesText, ROAD_FACTOR, roadKm } from './localTransport'
import { haversineKm } from '@/lib/geo'
import { newItemInputSchema } from '@/types'

const centre = (id: string) => transitCity(id)!.centre
/** A point `km` straight north of `p` (1° of latitude ≈ 111.19 km). */
const north = (p: { lat: number; lng: number }, km: number) => ({ lat: p.lat + km / 111.19, lng: p.lng })
const modes = (r: ReturnType<typeof localOptions>) => r.options.map((o) => o.mode)

describe('road distance', () => {
  it('is the straight line times 1.3', () => {
    const a = centre('delhi')
    const b = north(a, 10)
    expect(roadKm(a, b)).toBeCloseTo(haversineKm(a, b) * ROAD_FACTOR, 1)
    expect(ROAD_FACTOR).toBe(1.3)
  })
})

describe('fare tables', () => {
  it('prefers the destination, then the country, then the generic table', () => {
    expect(fareTableFor('goa').scope).toBe('destination')
    expect(fareTableFor('bali')).toMatchObject({ scope: 'destination', table: { currency: 'IDR' } })
    expect(fareTableFor('mumbai')).toMatchObject({ scope: 'country', table: { currency: 'INR' } })
    expect(fareTableFor('surabaya')).toMatchObject({ scope: 'country', table: { currency: 'IDR' } })
    expect(fareTableFor('japan')).toMatchObject({ scope: 'destination', table: { currency: 'JPY' } })
    expect(fareTableFor('paris')).toMatchObject({ scope: 'destination', table: { currency: 'EUR' } })
    expect(fareTableFor('lisbon')).toMatchObject({ scope: 'generic', table: { currency: 'USD' } })
    expect(fareTableFor(undefined).scope).toBe('generic')
  })
})

describe('localOptions', () => {
  const a = centre('jaipur')

  it('estimates a metered fare as base + per km with a +/-20% range, in INR', () => {
    const r = localOptions(a, north(a, 10), 'jaipur')
    const cab = r.options.find((o) => o.mode === 'cab')!
    // 10 km straight = 13 km by road: 50 + 15 × 13 = 245 → rounded to 250; range 196–294 → 200–290.
    expect(r.roadKm).toBeCloseTo(13, 0)
    expect(cab.fare.typical).toEqual({ amount: 250, currency: 'INR' })
    expect(cab.fare.min.amount).toBe(200)
    expect(cab.fare.max.amount).toBe(290)
    expect(cab.fare.min.amount).toBeLessThan(cab.fare.typical.amount)
    expect(cab.fare.max.amount).toBeGreaterThan(cab.fare.typical.amount)
  })

  it('never goes under the minimum fare', () => {
    const cab = localOptions(a, north(a, 0.2), 'jaipur').options.find((o) => o.mode === 'cab')!
    expect(cab.fare.typical.amount).toBe(130)
  })

  it('uses published bands for city buses, and a fixed fare shows as one price', () => {
    const bus = localOptions(a, north(a, 6), 'jaipur').options.find((o) => o.mode === 'city_bus')!
    // 7.8 km by road falls in the 10 km band: ₹15–30.
    expect([bus.fare.min.amount, bus.fare.max.amount]).toEqual([15, 30])
    const metro = localOptions(centre('delhi'), north(centre('delhi'), 3), 'delhi').options.find((o) => o.mode === 'metro')!
    expect(metro.fare.min.amount).toBe(metro.fare.max.amount)
    expect(fareRangeText(metro, (m) => `₹${m.amount}`)).toBe(`₹${metro.fare.typical.amount}`)
    expect(fareRangeText(bus, (m) => `₹${m.amount}`)).toBe('₹15–₹30')
  })

  it('converts other currencies to INR', () => {
    const bali = centre('bali')
    const cab = localOptions(bali, north(bali, 10), 'bali').options.find((o) => o.mode === 'cab')!
    // 13 km: 15,000 + 7,000 × 13 = 106,000 IDR ≈ ₹560.
    expect(cab.fare.typical.currency).toBe('INR')
    expect(cab.fare.typical.amount).toBeGreaterThan(400)
    expect(cab.fare.typical.amount).toBeLessThan(700)
  })

  it('estimates time from the distance, slower in town than on the road', () => {
    const near = localOptions(a, north(a, 3), 'jaipur').options.find((o) => o.mode === 'cab')!
    const far = localOptions(a, north(a, 100), 'jaipur').options.find((o) => o.mode === 'cab')!
    expect(near.minutes).toBeGreaterThan(10)
    expect(near.minutes).toBeLessThan(30)
    expect(far.minutes).toBeGreaterThan(120)
    expect(far.minutes).toBeLessThan(220)
  })

  it('drops a mode beyond its range', () => {
    expect(modes(localOptions(a, north(a, 5), 'jaipur'))).toEqual(expect.arrayContaining(['auto', 'city_bus', 'scooter', 'ride_hailing', 'cab']))
    // 20 km straight = 26 km by road: past the auto-rickshaw's 15 km.
    const mid = modes(localOptions(a, north(a, 20), 'jaipur'))
    expect(mid).not.toContain('auto')
    expect(mid).toContain('cab')
    // 100 km straight = 130 km by road: only a cab goes that far.
    expect(modes(localOptions(a, north(a, 100), 'jaipur'))).toEqual(['cab'])
  })

  it('has metro only in Delhi, Mumbai, Japan and Paris', () => {
    for (const id of ['delhi', 'mumbai', 'japan', 'paris']) expect(modes(localOptions(centre(id), north(centre(id), 5), id)), id).toContain('metro')
    for (const id of ['jaipur', 'udaipur', 'jodhpur', 'goa', 'manali', 'bali']) expect(modes(localOptions(centre(id), north(centre(id), 5), id)), id).not.toContain('metro')
  })

  it('leaves out modes a place does not have', () => {
    expect(modes(localOptions(centre('goa'), north(centre('goa'), 5), 'goa'))).not.toContain('auto')
    expect(modes(localOptions(centre('paris'), north(centre('paris'), 5), 'paris'))).not.toContain('scooter')
  })

  it('says too far beyond 350 km by road, with no options', () => {
    const r = localOptions(centre('delhi'), centre('mumbai'), 'delhi')
    expect(r.roadKm).toBeGreaterThan(LOCAL_MAX_KM)
    expect(r).toMatchObject({ tooFar: true, options: [] })
    // Just inside the limit: 350 / 1.3 ≈ 269 km straight.
    expect(localOptions(a, north(a, 265), 'jaipur').tooFar).toBe(false)
    expect(localOptions(a, north(a, 275), 'jaipur').tooFar).toBe(true)
    // Udaipur–Jodhpur has no train but is within reach of a cab.
    const gap = localOptions(centre('udaipur'), centre('jodhpur'), 'udaipur')
    expect(gap.tooFar).toBe(false)
    expect(modes(gap)).toEqual(['cab'])
  })

  it('lists the cheapest typical fare first', () => {
    const fares = localOptions(a, north(a, 8), 'jaipur').options.map((o) => o.fare.typical.amount)
    expect(fares).toEqual([...fares].sort((x, y) => x - y))
  })
})

describe('adding an option to the itinerary', () => {
  it('becomes a transport stop with the typical fare and no location of its own', () => {
    const a = centre('jaipur')
    const cab = localOptions(a, north(a, 10), 'jaipur').options.find((o) => o.mode === 'cab')!
    const stop = localOptionStop(cab, 'Hotel', 'Amber Fort', '10:15')
    expect(newItemInputSchema.safeParse(stop).success).toBe(true)
    expect(stop).toMatchObject({ category: 'transport', startTime: '10:15', estimatedCost: cab.fare.typical, title: 'Cab: Hotel → Amber Fort' })
    expect(stop.durationMin).toBe(cab.minutes)
    expect(stop.customLocation).toBeUndefined()
    expect(stop.placeId).toBeUndefined()
    expect(stop.description).toMatch(/not a quote/i)
  })

  it('starts when the stop before it ends, or at 09:00 at the start of a day', () => {
    const day = [{ startTime: '09:00', durationMin: 90 }, { startTime: '12:00', durationMin: 60 }]
    expect(insertStartTime(day, 1)).toBe('10:30')
    expect(insertStartTime(day, 2)).toBe('13:00')
    expect(insertStartTime(day, 0)).toBe('09:00')
    expect(insertStartTime([], 0)).toBe('09:00')
  })

  it('formats minutes', () => {
    expect([minutesText(25), minutesText(60), minutesText(95)]).toEqual(['25 min', '1 h', '1 h 35 min'])
  })
})
