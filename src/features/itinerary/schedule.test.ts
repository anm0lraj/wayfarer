import { describe, expect, it } from 'vitest'
import { buildSeed } from '@/data/seedData'
import { dayLoad, endTime, fromMinutes, retime, scheduleWarnings, suggestNextStart, toMinutes } from './schedule'
import type { ItineraryItem } from '@/types'

const item = (id: string, startTime: string, durationMin: number, travel?: number, title = id): ItineraryItem =>
  ({ id, title, startTime, durationMin, travelTimeFromPrevMin: travel }) as ItineraryItem

describe('time helpers', () => {
  it('converts and clamps', () => {
    expect(toMinutes('09:30')).toBe(570)
    expect(fromMinutes(570)).toBe('09:30')
    expect(fromMinutes(24 * 60 + 30)).toBe('23:59')
    expect(endTime(item('a', '13:00', 75))).toBe('14:15')
  })
})

describe('scheduleWarnings', () => {
  it('flags too little travel time with the recommended time, as in the spec', () => {
    const w = scheduleWarnings([item('a', '10:00', 60), item('b', '11:15', 60, 35)])
    expect(w).toHaveLength(1)
    expect(w[0]).toMatchObject({ itemId: 'b', kind: 'tight' })
    expect(w[0]!.message).toBe('This schedule gives you only 15 minutes to travel between these locations. Recommended travel time: 35 minutes.')
  })
  it('flags overlaps and out-of-order stops', () => {
    expect(scheduleWarnings([item('a', '10:00', 90), item('b', '10:30', 30)])[0]).toMatchObject({ kind: 'overlap' })
    expect(scheduleWarnings([item('a', '14:00', 60), item('b', '09:00', 30)])[0]).toMatchObject({ kind: 'order' })
  })
  it('stays quiet when there is enough time', () => {
    expect(scheduleWarnings([item('a', '10:00', 60), item('b', '12:00', 60, 35)])).toEqual([])
  })
})

describe('demo data', () => {
  it('the seeded Bali trip has realistic timing: no warnings out of the box', () => {
    const s = buildSeed()
    for (const day of s.days.filter((d) => d.tripId === 'trip-bali')) {
      const items = s.items.filter((i) => i.dayId === day.id).sort((a, b) => a.position - b.position)
      expect(scheduleWarnings(items), `Day ${day.dayNumber}`).toEqual([])
    }
  })
})

describe('dayLoad / retime / suggestNextStart', () => {
  it('marks long or crowded days busy', () => {
    expect(dayLoad([item('a', '09:00', 60)]).busy).toBe(false)
    expect(dayLoad(Array.from({ length: 7 }, (_, i) => item(String(i), '09:00', 30))).busy).toBe(true)
    expect(dayLoad([item('a', '08:00', 600, 0), item('b', '19:00', 100, 30)]).busy).toBe(true)
  })
  it('retime keeps the first start and spaces the rest by travel, rounded up to 5 minutes', () => {
    const r = retime([item('a', '10:00', 60), item('b', '10:30', 60, 23), item('c', '09:00', 30, 0)])
    expect(r).toEqual([
      { id: 'a', startTime: '10:00' },
      { id: 'b', startTime: '11:25' }, // 11:00 end + 23 → 11:23 → 11:25
      { id: 'c', startTime: '12:35' }, // 12:25 end + 10 minimum gap → 12:35
    ])
    expect(scheduleWarnings(retime([item('a', '10:00', 60), item('b', '10:30', 60, 23)]).map((t, i) => ({ ...item(t.id, t.startTime, 60, i ? 23 : undefined) })))).toEqual([])
  })
  it('suggests a start after the last stop', () => {
    expect(suggestNextStart([])).toBe('10:00')
    expect(suggestNextStart([item('a', '10:00', 60)])).toBe('11:15')
  })
})
