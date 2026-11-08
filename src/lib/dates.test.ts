import { describe, expect, it } from 'vitest'
import { zonedIso } from './dates'
import { zonedMs } from '../../api/_lib/push/rules'

/** The wall clock (YYYY-MM-DD HH:mm) in `timeZone` at an ISO instant. */
const wallAt = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

describe('zonedIso across daylight-saving changes', () => {
  it.each([
    // New York, 2026: clocks go forward at 02:00 on 8 March, back at 02:00 on 1 November.
    ['America/New_York', '2026-03-07', '23:30', '2026-03-08T04:30:00.000Z'],
    ['America/New_York', '2026-03-08', '01:30', '2026-03-08T06:30:00.000Z'],
    ['America/New_York', '2026-03-08', '03:30', '2026-03-08T07:30:00.000Z'],
    ['America/New_York', '2026-03-08', '12:00', '2026-03-08T16:00:00.000Z'],
    ['America/New_York', '2026-11-01', '00:30', '2026-11-01T04:30:00.000Z'],
    ['America/New_York', '2026-11-01', '02:30', '2026-11-01T07:30:00.000Z'],
    ['America/New_York', '2026-11-01', '09:00', '2026-11-01T14:00:00.000Z'],
    // Paris, 2026: forward at 02:00 on 29 March, back at 03:00 on 25 October.
    ['Europe/Paris', '2026-03-29', '01:30', '2026-03-29T00:30:00.000Z'],
    ['Europe/Paris', '2026-03-29', '03:30', '2026-03-29T01:30:00.000Z'],
    ['Europe/Paris', '2026-03-29', '09:00', '2026-03-29T07:00:00.000Z'],
    ['Europe/Paris', '2026-10-25', '01:30', '2026-10-24T23:30:00.000Z'],
    ['Europe/Paris', '2026-10-25', '03:30', '2026-10-25T02:30:00.000Z'],
    ['Europe/Paris', '2026-10-25', '09:00', '2026-10-25T08:00:00.000Z'],
  ])('%s %s %s → %s', (zone, date, time, expected) => {
    expect(zonedIso(date, time, zone)).toBe(expected)
    expect(new Date(zonedMs(date, time, zone)).toISOString()).toBe(expected) // the push server's copy agrees
  })

  it('gives the first of a repeated time when the clocks go back', () => {
    expect(zonedIso('2026-11-01', '01:30', 'America/New_York')).toBe('2026-11-01T05:30:00.000Z') // 01:30 EDT, not EST
    expect(zonedIso('2026-10-25', '02:30', 'Europe/Paris')).toBe('2026-10-25T00:30:00.000Z') // 02:30 CEST, not CET
  })

  it('moves a time that does not exist forward by the gap when the clocks go forward', () => {
    expect(zonedIso('2026-03-08', '02:30', 'America/New_York')).toBe('2026-03-08T07:30:00.000Z') // read as 03:30 EDT
    expect(zonedIso('2026-03-29', '02:30', 'Europe/Paris')).toBe('2026-03-29T01:30:00.000Z') // read as 03:30 CEST
  })

  it('reads back as the same wall clock for every half hour around each change (outside the skipped hour)', () => {
    for (const [zone, date, skipped] of [
      ['America/New_York', '2026-03-08', '02:'], ['America/New_York', '2026-11-01', null],
      ['Europe/Paris', '2026-03-29', '02:'], ['Europe/Paris', '2026-10-25', null],
    ] as const) {
      for (let h = 0; h < 24; h++) {
        for (const min of ['00', '30']) {
          const time = `${String(h).padStart(2, '0')}:${min}`
          if (skipped && time.startsWith(skipped)) continue
          expect(wallAt(zonedIso(date, time, zone), zone)).toBe(`${date} ${time}`)
        }
      }
    }
  })
})

describe('zonedIso where there is no daylight saving', () => {
  it.each([
    ['Asia/Kolkata', '2026-10-12', '09:00', '2026-10-12T03:30:00.000Z'],
    ['Asia/Kolkata', '2026-03-08', '02:30', '2026-03-07T21:00:00.000Z'],
    ['Asia/Kolkata', '2026-11-01', '01:30', '2026-10-31T20:00:00.000Z'],
    ['Asia/Makassar', '2026-10-12', '14:00', '2026-10-12T06:00:00.000Z'], // Bali
    ['Asia/Makassar', '2026-10-13', '00:15', '2026-10-12T16:15:00.000Z'],
    ['UTC', '2026-03-29', '02:30', '2026-03-29T02:30:00.000Z'],
  ])('%s %s %s → %s', (zone, date, time, expected) => {
    expect(zonedIso(date, time, zone)).toBe(expected)
  })
})
