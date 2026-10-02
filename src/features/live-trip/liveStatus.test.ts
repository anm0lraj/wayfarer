import { describe, expect, it } from 'vitest'
import { formatClock, greetingFor, isNear, liveItems, liveSnapshot } from './liveStatus'
import type { ItineraryItem } from '@/types'

const TZ = 'Asia/Makassar' // UTC+8
const item = (id: string, startTime: string, durationMin: number, status: ItineraryItem['status'] = 'upcoming'): ItineraryItem => ({
  id, tripId: 't', dayId: 'd', position: 0, startTime, durationMin, title: id, category: 'food', status, source: 'user', createdAt: '', updatedAt: '',
})
const at = (hhmm: string) => new Date(`2026-10-13T${hhmm}:00+08:00`)
const items = [item('a', '08:00', 60), item('b', '10:00', 120), item('c', '13:00', 90)]

describe('liveItems', () => {
  it('infers "in progress" only inside the time window', () => {
    const l = liveItems(items, '2026-10-13', TZ, at('10:30'))
    expect(l.map((x) => x.status)).toEqual(['upcoming', 'in_progress', 'upcoming'])
    expect(l[1]!.auto).toBe(true)
  })

  it('never infers completed: a missed item is overdue and awaits confirmation', () => {
    const l = liveItems(items, '2026-10-13', TZ, at('12:30'))
    expect(l[0]).toMatchObject({ status: 'upcoming', overdue: true })
    expect(l[1]).toMatchObject({ status: 'upcoming', overdue: true })
    expect(l[2]!.overdue).toBe(false)
  })

  it('respects the traveller’s own status even when the clock disagrees', () => {
    const l = liveItems([item('a', '08:00', 60, 'skipped'), item('b', '10:00', 60, 'completed')], '2026-10-13', TZ, at('10:30'))
    expect(l.map((x) => [x.status, x.auto])).toEqual([['skipped', false], ['completed', false]])
  })
})

describe('liveSnapshot', () => {
  it('picks the current item, the next one, and what is done', () => {
    const list = liveItems([item('a', '08:00', 60, 'completed'), ...items.slice(1)], '2026-10-13', TZ, at('10:30'))
    const s = liveSnapshot(list)
    expect(s.current?.item.id).toBe('b')
    expect(s.next?.item.id).toBe('c')
    expect(s.done).toHaveLength(1)
    expect(s.remaining).toHaveLength(2)
  })

  it('skips overdue items when choosing what is next', () => {
    const s = liveSnapshot(liveItems(items, '2026-10-13', TZ, at('12:30')))
    expect(s.current).toBeUndefined()
    expect(s.overdue.map((l) => l.item.id)).toEqual(['a', 'b'])
    expect(s.next?.item.id).toBe('c')
  })

  it('has no next item once everything is handled', () => {
    const done = items.map((i) => ({ ...i, status: 'completed' as const }))
    expect(liveSnapshot(liveItems(done, '2026-10-13', TZ, at('20:00'))).next).toBeUndefined()
  })
})

describe('helpers', () => {
  it('greets by the trip’s local hour, not the device’s', () => {
    expect(greetingFor(new Date('2026-10-13T00:30:00Z'), TZ)).toBe('Good morning') // 08:30 local
    expect(greetingFor(new Date('2026-10-13T10:30:00Z'), TZ)).toBe('Good evening') // 18:30 local
  })
  it('formats a 24h time as 12h', () => {
    expect(formatClock('09:00')).toBe('9:00 AM')
    expect(formatClock('00:15')).toBe('12:15 AM')
    expect(formatClock('13:30')).toBe('1:30 PM')
  })
  it('treats ~150 m as arrived', () => {
    expect(isNear({ lat: -8.65, lng: 115.2 }, { lat: -8.6505, lng: 115.2 })).toBe(true)
    expect(isNear({ lat: -8.65, lng: 115.2 }, { lat: -8.66, lng: 115.2 })).toBe(false)
  })
})
