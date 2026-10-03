import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseEnv } from '@/config/env'
import { osrmRouting } from './maps/osrm'
import { FORECAST_DAYS, conditionFor, openMeteoWeather, reachableRange } from './weather/openMeteo'

const bali = { lat: -8.65, lng: 115.2 }

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => handler(String(input)))
  vi.stubGlobal('fetch', fn)
  return fn
}
afterEach(() => vi.unstubAllGlobals())

describe('weather codes', () => {
  it('map to the conditions the app draws', () => {
    expect([0, 1].map(conditionFor)).toEqual(['sunny', 'sunny'])
    expect(conditionFor(2)).toBe('partly_cloudy')
    expect([3, 45, 48].map(conditionFor)).toEqual(['cloudy', 'cloudy', 'cloudy'])
    expect([51, 61, 65, 80, 82].map(conditionFor).every((c) => c === 'rain')).toBe(true)
    expect([71, 75, 77, 85].map(conditionFor).every((c) => c === 'snow')).toBe(true)
    expect([95, 96, 99].map(conditionFor).every((c) => c === 'storm')).toBe(true)
  })
})

describe('how far ahead a forecast reaches', () => {
  const today = new Date('2026-10-03T12:00:00')
  it('keeps the part of the trip that is within reach', () => {
    expect(reachableRange('2026-10-12', '2026-10-16', today)).toEqual({ start: '2026-10-12', end: '2026-10-16' })
    expect(reachableRange('2026-10-10', '2026-11-20', today)).toEqual({ start: '2026-10-10', end: '2026-10-18' }) // 16 days from today
    expect(reachableRange('2026-09-20', '2026-10-05', today)).toEqual({ start: '2026-10-03', end: '2026-10-05' }) // past days are not forecast
  })
  it('is empty when the trip is entirely out of reach', () => {
    expect(reachableRange('2026-12-01', '2026-12-05', today)).toBeUndefined()
    expect(reachableRange('2026-08-01', '2026-08-05', today)).toBeUndefined()
    expect(FORECAST_DAYS).toBe(16)
  })
})

describe('Open-Meteo adapter', () => {
  const daily = (dates: string[]) => ({
    daily: {
      time: dates, weather_code: dates.map(() => 61), temperature_2m_max: dates.map(() => 30.6), temperature_2m_min: dates.map(() => 24.2), precipitation_probability_max: dates.map((_, i) => (i === 0 ? null : 80)),
    },
  })

  it('turns the answer into our forecast days', async () => {
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)
    const next = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
    const fetchMock = stubFetch(() => Response.json(daily([soon, next])))
    const days = await openMeteoWeather.getForecast(bali, soon, next)
    expect(days).toEqual([
      { date: soon, condition: 'rain', highC: 31, lowC: 24, rainChancePct: 0 },
      { date: next, condition: 'rain', highC: 31, lowC: 24, rainChancePct: 80 },
    ])
    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.origin).toBe('https://api.open-meteo.com')
    expect(url.searchParams.get('latitude')).toBe('-8.65')
    expect(url.searchParams.get('timezone')).toBe('auto')
  })

  it('does not ask at all for dates a forecast cannot cover', async () => {
    const fetchMock = stubFetch(() => Response.json({}))
    expect(await openMeteoWeather.getForecast(bali, '2031-01-01', '2031-01-05')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the current conditions', async () => {
    stubFetch(() => Response.json({ current: { temperature_2m: 27.6, weather_code: 3 } }))
    expect(await openMeteoWeather.getCurrent(bali)).toEqual({ condition: 'cloudy', tempC: 28 })
  })

  it('reports a failure instead of inventing weather', async () => {
    stubFetch(() => new Response('{}', { status: 500 }))
    await expect(openMeteoWeather.getCurrent(bali)).rejects.toThrow('Weather unavailable')
    await expect(openMeteoWeather.getForecast(bali, new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10))).rejects.toThrow()
  })
})

describe('OSRM road routing', () => {
  const stops = [{ lat: -8.7467, lng: 115.1668 }, { lat: -8.6913, lng: 115.1682 }, { lat: -8.8291, lng: 115.0849 }]
  const osrm = { code: 'Ok', routes: [{ distance: 41250, duration: 3125, geometry: { coordinates: [[115.1668, -8.7467], [115.17, -8.72], [115.0849, -8.8291]] } }] }

  it('returns the road geometry, distance and time between the stops', async () => {
    const fetchMock = stubFetch(() => Response.json(osrm))
    const r = await osrmRouting.route(stops)
    expect(r.points).toEqual([{ lat: -8.7467, lng: 115.1668 }, { lat: -8.72, lng: 115.17 }, { lat: -8.8291, lng: 115.0849 }])
    expect(r.distanceKm).toBe(41.3)
    expect(r.durationMin).toBe(52)
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/route/v1/driving/115.16680,-8.74670;115.16820,-8.69130;115.08490,-8.82910')
  })

  it('asks once for the same stops', async () => {
    const fetchMock = stubFetch(() => Response.json(osrm))
    const other = [{ lat: 1, lng: 2 }, { lat: 1.1, lng: 2.1 }]
    await osrmRouting.route(other)
    await osrmRouting.route(other)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the straight line when there is no road route', async () => {
    stubFetch(() => new Response('{}', { status: 503 }))
    const r = await osrmRouting.route([{ lat: 5, lng: 5 }, { lat: 5.2, lng: 5.2 }])
    expect(r.points).toHaveLength(2)
    expect(r.distanceKm).toBeGreaterThan(0)
  })

  it('has nothing to route for fewer than two stops', async () => {
    const fetchMock = stubFetch(() => Response.json(osrm))
    expect(await osrmRouting.route([{ lat: 1, lng: 1 }])).toEqual({ points: [{ lat: 1, lng: 1 }], distanceKm: 0, durationMin: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('choosing live services by environment', () => {
  it('defaults to the demo data and accepts live', () => {
    expect(parseEnv({})).toMatchObject({ weather: 'mock', routing: 'mock' })
    expect(parseEnv({ VITE_WEATHER: 'live', VITE_ROUTING: 'live' })).toMatchObject({ weather: 'live', routing: 'live' })
    expect(() => parseEnv({ VITE_WEATHER: 'maybe' })).toThrow('Invalid environment configuration')
  })
})
