import { describe, expect, it } from 'vitest'
import { searchTransit, shiftStamp, TIMETABLE_ROWS } from './transit'
import { TRANSIT_CITIES, transitCity } from './transitCities'
import { transitServiceSchema } from '@/types'

const DATE = '2026-10-12'

describe('sample timetable', () => {
  it('only names known cities and every result parses against the schema', () => {
    const ids = new Set(TRANSIT_CITIES.map((c) => c.id))
    for (const row of TIMETABLE_ROWS) {
      expect(ids.has(row.a[0]), row.number).toBe(true)
      expect(ids.has(row.b[0]), row.number).toBe(true)
      for (const [from, to] of [[row.a[0], row.b[0]], [row.b[0], row.a[0]]] as const) {
        for (const s of searchTransit(row.mode, from, to, DATE)) expect(() => transitServiceSchema.parse(s), s.id).not.toThrow()
      }
    }
  })

  it('every city has a start city that exists and is not itself', () => {
    for (const c of TRANSIT_CITIES) {
      expect(transitCity(c.startsFrom), c.id).toBeDefined()
      expect(c.startsFrom).not.toBe(c.id)
    }
  })

  it('serves a row in both directions, with ids that name the number, stops and date', () => {
    const out = searchTransit('train', 'delhi', 'jaipur', DATE).map((s) => s.id)
    expect(out).toContain('tr-12015-NDLS-JP-2026-10-12')
    const back = searchTransit('train', 'jaipur', 'delhi', DATE)
    expect(back.map((s) => s.id)).toContain('tr-12015-JP-NDLS-2026-10-12')
    // The return leaves from the other end at its own time.
    expect(back.find((s) => s.number === '12015')?.departAt).toBe('2026-10-12T17:50:00+05:30')
  })

  it('returns services earliest first, in the requested mode only', () => {
    const buses = searchTransit('bus', 'delhi', 'jaipur', DATE)
    expect(buses.length).toBeGreaterThan(1)
    expect(buses.every((s) => s.mode === 'bus' && s.id.startsWith('bs-'))).toBe(true)
    expect(buses.map((s) => s.departAt.slice(11, 16))).toEqual([...buses.map((s) => s.departAt.slice(11, 16))].sort())
  })

  it('has deliberate gaps for the local-transport fallback', () => {
    expect(searchTransit('train', 'udaipur', 'jodhpur', DATE)).toEqual([])
    expect(searchTransit('bus', 'udaipur', 'jodhpur', DATE).length).toBeGreaterThan(0)
    expect(searchTransit('train', 'delhi', 'manali', DATE)).toEqual([])
    expect(searchTransit('bus', 'delhi', 'manali', DATE).length).toBeGreaterThan(0)
    expect(searchTransit('train', 'bali', 'surabaya', DATE)).toEqual([])
    expect(searchTransit('bus', 'manali', 'bali', DATE)).toEqual([])
  })

  it('covers Bali by bus and ferry, and Surabaya–Yogyakarta by train', () => {
    for (const to of ['surabaya', 'yogyakarta']) {
      const [s] = searchTransit('bus', 'bali', to, DATE)
      expect(s?.note).toMatch(/ferry/)
    }
    expect(searchTransit('train', 'surabaya', 'yogyakarta', DATE).length).toBeGreaterThan(0)
  })

  it('stamps each end with its own UTC offset', () => {
    const [s] = searchTransit('bus', 'bali', 'surabaya', DATE)
    // 17:00 in Bali (+08:00) plus 11 h is 04:00 Bali time the next morning, which reads 03:00 in Surabaya (+07:00).
    expect(s?.departAt).toBe('2026-10-12T17:00:00+08:00')
    expect(s?.arriveAt).toBe('2026-10-13T03:00:00+07:00')
  })

  it('shiftStamp rolls over midnight and changes offset', () => {
    expect(shiftStamp('2026-10-12T22:30:00+05:30', 360, 330)).toBe('2026-10-13T04:30:00+05:30')
    expect(shiftStamp('2026-10-12T22:30:00+05:30', 60, 480)).toBe('2026-10-13T02:00:00+08:00')
  })
})
