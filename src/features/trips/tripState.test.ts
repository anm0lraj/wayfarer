import { describe, expect, it } from 'vitest'
import { canTransition, computeTripState, currentDayNumber } from './tripState'

const base = { startDate: '2026-10-12', endDate: '2026-10-16', timezone: 'Asia/Makassar' }
const at = (iso: string) => new Date(iso)

describe('computeTripState', () => {
  it('keeps persisted state far from the trip', () => {
    expect(computeTripState({ ...base, state: 'planning' }, at('2026-09-01T00:00:00Z'))).toBe('planning')
    expect(computeTripState({ ...base, state: 'ready' }, at('2026-09-01T00:00:00Z'))).toBe('ready')
  })
  it('turns a ready trip upcoming inside the 14-day window only', () => {
    expect(computeTripState({ ...base, state: 'ready' }, at('2026-09-28T00:00:00Z'))).toBe('upcoming')
    expect(computeTripState({ ...base, state: 'ready' }, at('2026-09-27T00:00:00Z'))).toBe('ready')
    expect(computeTripState({ ...base, state: 'planning' }, at('2026-10-05T00:00:00Z'))).toBe('planning')
  })
  it('is active from the start date in the trip timezone', () => {
    // 2026-10-11 17:00Z is already 12 Oct 01:00 in Bali (UTC+8)
    expect(computeTripState({ ...base, state: 'ready' }, at('2026-10-11T17:00:00Z'))).toBe('active')
    expect(computeTripState({ ...base, state: 'ready' }, at('2026-10-11T15:00:00Z'))).toBe('upcoming')
  })
  it('completes after the end date and respects archive', () => {
    expect(computeTripState({ ...base, state: 'ready' }, at('2026-10-16T16:30:00Z'))).toBe('completed')
    expect(computeTripState({ ...base, state: 'archived' }, at('2026-10-14T00:00:00Z'))).toBe('archived')
  })
})

describe('transitions and day number', () => {
  it('allows only defined stored transitions', () => {
    expect(canTransition('draft', 'planning')).toBe(true)
    expect(canTransition('draft', 'ready')).toBe(false)
    expect(canTransition('archived', 'planning')).toBe(true)
  })
  it('numbers trip days', () => {
    expect(currentDayNumber(base, at('2026-10-13T04:00:00Z'))).toBe(2)
    expect(currentDayNumber(base, at('2026-10-20T04:00:00Z'))).toBeNull()
  })
})
