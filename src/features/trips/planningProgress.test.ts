import { describe, expect, it } from 'vitest'
import { computePlanningProgress } from './planningProgress'
import type { Booking, ItineraryDay, ItineraryItem } from '@/types'

const days = [1, 2].map((n) => ({ id: `d${n}`, tripId: 't', dayNumber: n, date: '2026-10-1' + n })) as ItineraryDay[]
const item = (dayId: string, i: number) => ({ id: `${dayId}-${i}`, dayId }) as ItineraryItem
const booking = (type: Booking['type'], status: Booking['status'] = 'saved') => ({ type, status }) as Booking
const trip = { id: 't' }

describe('computePlanningProgress', () => {
  it('starts at 0% with the right next steps for an empty trip', () => {
    const p = computePlanningProgress(trip, days, [], [])
    expect(p.percent).toBe(0)
    expect(p.tasks.map((t) => t.label)).toEqual(['Add activities', 'Add accommodation', 'Add flights'])
  })

  it('weights days 50%, hotel 25%, flight 25%', () => {
    const items = [item('d1', 1), item('d1', 2), item('d1', 3)]
    expect(computePlanningProgress(trip, days, items, []).percent).toBe(25)
    expect(computePlanningProgress(trip, days, items, [booking('hotel')]).percent).toBe(50)
    expect(computePlanningProgress(trip, days, items, [booking('hotel'), booking('flight')]).percent).toBe(75)
  })

  it('ignores cancelled bookings and points at unfinished days', () => {
    const p = computePlanningProgress(trip, days, [item('d1', 1)], [booking('hotel', 'cancelled')])
    expect(p.tasks.map((t) => t.label)).toContain('Complete Day 1')
    expect(p.tasks.map((t) => t.label)).toContain('Add accommodation')
  })

  it('reaches 100% and suggests reviewing the route', () => {
    const items = days.flatMap((d) => [1, 2, 3].map((i) => item(d.id, i)))
    const p = computePlanningProgress(trip, days, items, [booking('hotel'), booking('flight')])
    expect(p.percent).toBe(100)
    expect(p.tasks.map((t) => t.label)).toEqual(['Review route'])
  })
})
