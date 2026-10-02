import { describe, expect, it } from 'vitest'
import { buildNotifications, type RuleContext } from './rules'
import type { Booking, ItineraryItem } from '@/types'

const TZ = 'Asia/Makassar'
const trip: RuleContext['trip'] = { id: 't1', place: 'Bali', title: '5 Days in Bali', startDate: '2026-10-12', endDate: '2026-10-16', timezone: TZ, effectiveState: 'upcoming' }
const days = [1, 2, 3].map((n) => ({ id: `d${n}`, tripId: 't1', dayNumber: n, date: `2026-10-${11 + n}` }))
const item = (id: string, dayId: string, startTime: string, durationMin = 60, status: ItineraryItem['status'] = 'upcoming'): ItineraryItem => ({
  id, tripId: 't1', dayId, position: 0, startTime, durationMin, title: `Item ${id}`, category: 'food', status, source: 'user', createdAt: '', updatedAt: '',
})
const at = (iso: string) => new Date(iso)
const ctx = (over: Partial<RuleContext>): RuleContext => ({ trip, days, items: [], bookings: [], now: at('2026-10-05T09:00:00+08:00'), ...over })

describe('buildNotifications', () => {
  it('counts down 7 days and 1 day before, and only then', () => {
    expect(buildNotifications(ctx({ now: at('2026-10-05T09:00:00+08:00') })).map((n) => n.type)).toEqual(['trip_countdown'])
    expect(buildNotifications(ctx({ now: at('2026-10-05T09:00:00+08:00') }))[0]!.title).toBe('Your Bali trip starts in 7 days.')
    expect(buildNotifications(ctx({ now: at('2026-10-06T09:00:00+08:00') }))).toEqual([])
    expect(buildNotifications(ctx({ now: at('2026-10-11T09:00:00+08:00') }))[0]!.title).toBe('Your Bali trip starts tomorrow.')
  })

  it('is stable: the same moment always gives the same keys', () => {
    const a = buildNotifications(ctx({}))
    const b = buildNotifications(ctx({}))
    expect(a.map((n) => n.key)).toEqual(b.map((n) => n.key))
  })

  it('reminds about a hotel check-in the day before', () => {
    const hotel = { id: 'b1', tripId: 't1', type: 'hotel', title: 'Seminyak Garden Villas', startAt: '2026-10-12T06:00:00.000Z', status: 'saved', mode: 'demo' } as Booking
    const n = buildNotifications(ctx({ bookings: [hotel], now: at('2026-10-11T10:00:00+08:00') }))
    expect(n.map((x) => x.type)).toContain('checkin_reminder')
    expect(n.find((x) => x.type === 'checkin_reminder')!.title).toBe('Your hotel check-in is tomorrow.')
  })

  it('warns that an activity starts soon, once it is within 30 minutes', () => {
    const live = { ...trip, effectiveState: 'active' as const }
    const items = [item('a', 'd2', '10:00')]
    expect(buildNotifications(ctx({ trip: live, items, now: at('2026-10-13T09:45:00+08:00') })).find((n) => n.type === 'next_activity')?.title).toBe('Your next activity starts in 15 minutes.')
    expect(buildNotifications(ctx({ trip: live, items, now: at('2026-10-13T09:00:00+08:00') })).some((n) => n.type === 'next_activity')).toBe(false)
  })

  it('points out two or more unplanned hours while nothing is running', () => {
    const live = { ...trip, effectiveState: 'active' as const }
    const items = [item('a', 'd2', '13:00')]
    const n = buildNotifications(ctx({ trip: live, items, now: at('2026-10-13T10:30:00+08:00') }))
    expect(n.find((x) => x.type === 'free_time')?.title).toBe('You have 2 unplanned hours today.')
  })

  it('does not call time free while an activity is running', () => {
    const live = { ...trip, effectiveState: 'active' as const }
    const items = [item('a', 'd2', '09:00', 60, 'in_progress'), item('b', 'd2', '13:00')]
    expect(buildNotifications(ctx({ trip: live, items, now: at('2026-10-13T09:30:00+08:00') })).some((x) => x.type === 'free_time')).toBe(false)
  })

  it('flags a busy day, today or tomorrow', () => {
    const items = Array.from({ length: 7 }, (_, i) => item(`x${i}`, 'd2', '09:00'))
    const n = buildNotifications(ctx({ items, now: at('2026-10-12T09:00:00+08:00') }))
    expect(n.find((x) => x.type === 'busy_day')?.title).toBe('Your Day 2 itinerary may be too busy.')
  })

  it('alerts about rain only during the trip', () => {
    const live = { ...trip, effectiveState: 'active' as const }
    const forecast = { date: '2026-10-13', condition: 'rain' as const, highC: 29, lowC: 24, rainChancePct: 80 }
    expect(buildNotifications(ctx({ trip: live, forecast, now: at('2026-10-13T09:00:00+08:00') })).some((n) => n.type === 'weather_alert')).toBe(true)
    expect(buildNotifications(ctx({ forecast, now: at('2026-10-13T09:00:00+08:00') })).some((n) => n.type === 'weather_alert')).toBe(false)
  })

  it('is silent for finished and draft trips', () => {
    expect(buildNotifications(ctx({ trip: { ...trip, effectiveState: 'completed' } }))).toEqual([])
    expect(buildNotifications(ctx({ trip: { ...trip, effectiveState: 'draft' } }))).toEqual([])
  })
})
