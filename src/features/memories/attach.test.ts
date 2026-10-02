import { describe, expect, it } from 'vitest'
import { attachToPlan } from './attach'
import type { ItineraryDay, ItineraryItem } from '@/types'

const TZ = 'Asia/Makassar'
const days = [{ id: 'd1', date: '2026-10-12' }, { id: 'd2', date: '2026-10-13' }] as ItineraryDay[]
const item = (id: string, dayId: string, startTime: string, durationMin: number) => ({ id, dayId, startTime, durationMin }) as ItineraryItem
const items = [item('a', 'd1', '09:30', 45), item('b', 'd1', '13:00', 75), item('c', 'd2', '10:00', 120)]

describe('attachToPlan', () => {
  it('picks the activity running at that moment', () => {
    expect(attachToPlan('2026-10-12T13:30:00+08:00', TZ, days, items)).toEqual({ dayId: 'd1', itemId: 'b' })
  })
  it('falls back to the most recent activity that started earlier that day', () => {
    expect(attachToPlan('2026-10-12T16:00:00+08:00', TZ, days, items)).toEqual({ dayId: 'd1', itemId: 'b' })
  })
  it('keeps the day but no activity when it was before the first one', () => {
    expect(attachToPlan('2026-10-12T07:00:00+08:00', TZ, days, items)).toEqual({ dayId: 'd1', itemId: undefined })
  })
  it('uses the trip’s calendar day, not the device’s (late night UTC is next morning in Bali)', () => {
    expect(attachToPlan('2026-10-12T17:00:00Z', TZ, days, items).dayId).toBe('d2')
  })
  it('attaches to nothing outside the trip', () => {
    expect(attachToPlan('2026-10-20T10:00:00+08:00', TZ, days, items)).toEqual({})
  })
})
