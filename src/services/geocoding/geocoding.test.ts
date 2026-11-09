import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseEnv } from '@/config/env'
import { mockGeocoding } from './mock'
import { createNominatim, MIN_GAP_MS, parseRows } from './nominatim'

const bali = { lat: -8.65, lng: 115.2 }

describe('mock geocoder', () => {
  it('finds places by name, address or area, ignoring case and accents', async () => {
    expect((await mockGeocoding.search('CAFE de flore')).map((r) => r.name)).toEqual(['Café de Flore'])
    expect((await mockGeocoding.search('seminyak')).map((r) => r.name)).toEqual(['Petitenget Beach'])
    expect(await mockGeocoding.search('zzzz nothing')).toEqual([])
    expect(await mockGeocoding.search('   ')).toEqual([])
  })

  it('sorts by distance to the trip and is deterministic', async () => {
    const nearBali = await mockGeocoding.search('bali', bali)
    expect(nearBali.map((r) => r.id)).toEqual((await mockGeocoding.search('bali', bali)).map((r) => r.id))
    expect(nearBali[0]!.name).toBe('Petitenget Beach') // Seminyak is the closest of the four
    const nearUbud = await mockGeocoding.search('bali', { lat: -8.5, lng: 115.26 })
    expect(nearUbud[0]!.name).toBe('Warung Babi Guling Ibu Oka')
    const rajasthan = await mockGeocoding.search('rajasthan', { lat: 24.58, lng: 73.68 })
    expect(rajasthan[0]!.name).toBe('City Palace Udaipur')
  })

  it('covers the demo destinations and returns at most five', async () => {
    for (const q of ['bali', 'goa', 'tokyo', 'paris', 'jaipur', 'delhi', 'udaipur']) expect((await mockGeocoding.search(q)).length, q).toBeGreaterThan(0)
    expect((await mockGeocoding.search('a')).length).toBeLessThanOrEqual(5)
  })

  it('names a spot that is next to a known place, and has nothing for open sea', async () => {
    const hit = await mockGeocoding.reverse({ lat: 48.8607, lng: 2.3377 })
    expect(hit?.name).toBe('Louvre Museum')
    expect(hit?.point).toEqual({ lat: 48.8607, lng: 2.3377 })
    expect(await mockGeocoding.reverse({ lat: 0, lng: 0 })).toBeUndefined()
  })

  it('honours a cancelled request', async () => {
    const ctl = new AbortController()
    ctl.abort()
    await expect(mockGeocoding.search('bali', undefined, ctl.signal)).rejects.toMatchObject({ name: 'AbortError' })
    await expect(mockGeocoding.reverse(bali, ctl.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('Nominatim rows', () => {
  it('turns rows into places and drops the ones that do not parse', () => {
    const rows = [
      { place_id: 11, lat: '-8.6742', lon: '115.1566', display_name: 'Petitenget Beach, Seminyak, Bali, Indonesia', name: 'Petitenget Beach' },
      { place_id: 12, lat: '-8.7', lon: '115.2', display_name: 'Jalan Raya, Kuta, Bali' }, // no name: first part of the address
      { place_id: 13, lat: 'north', lon: '115.2', display_name: 'Bad latitude' },
      { place_id: 14, lat: '95', lon: '115.2', display_name: 'Latitude out of range' },
      { lat: '1', lon: '1', display_name: 'No id' },
      { place_id: 15, lat: '1', lon: '1' },
      'garbage',
    ]
    expect(parseRows(rows)).toEqual([
      { id: 'osm:11', name: 'Petitenget Beach', address: 'Petitenget Beach, Seminyak, Bali, Indonesia', point: { lat: -8.6742, lng: 115.1566 } },
      { id: 'osm:12', name: 'Jalan Raya', address: 'Jalan Raya, Kuta, Bali', point: { lat: -8.7, lng: 115.2 } },
    ])
  })

  it('treats anything that is not a list as no results', () => {
    expect(parseRows({ error: 'x' })).toEqual([])
    expect(parseRows(null)).toEqual([])
  })
})

describe('Nominatim adapter', () => {
  const row = (id: number) => ({ place_id: id, lat: '-8.5', lon: '115.2', display_name: `Place ${id}, Bali`, name: `Place ${id}` })
  let fetchMock: ReturnType<typeof vi.fn>
  const stub = (handler: (url: string) => Response | Promise<Response> = () => Response.json([row(1)])) => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(String(input)))
    vi.stubGlobal('fetch', fetchMock)
  }
  const nominatim = () => createNominatim({ language: () => 'en-IN' })

  // The shared setup pins `Date` with fake timers; drop that first or this second install is ignored.
  beforeEach(() => { vi.useRealTimers(); vi.useFakeTimers(); stub() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('asks for five results in the browser language with a soft viewbox, and nothing identifying', async () => {
    const results = await nominatim().search('  petitenget ', bali)
    expect(results.map((r) => r.name)).toEqual(['Place 1'])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const u = new URL(url)
    expect(u.origin + u.pathname).toBe('https://nominatim.openstreetmap.org/search')
    expect(u.searchParams.get('q')).toBe('petitenget')
    expect(u.searchParams.get('format')).toBe('jsonv2')
    expect(u.searchParams.get('limit')).toBe('5')
    expect(u.searchParams.get('accept-language')).toBe('en-IN')
    expect(u.searchParams.get('viewbox')).toBe('114.7000,-8.1500,115.7000,-9.1500') // left,top,right,bottom around the trip
    expect(u.searchParams.has('bounded')).toBe(false) // a bias, not a fence
    expect(u.searchParams.has('email')).toBe(false)
    expect(url).not.toMatch(/email|@/)
    expect(Object.keys(init)).toEqual(['signal']) // no headers option at all
  })

  it('leaves the viewbox out when there is no trip area, and does not ask for empty text', async () => {
    await nominatim().search('beach')
    expect(new URL((fetchMock.mock.calls[0] as [string])[0]).searchParams.has('viewbox')).toBe(false)
    fetchMock.mockClear()
    expect(await nominatim().search('   ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('looks up a point with reverse and keeps the point that was asked about', async () => {
    stub(() => Response.json({ place_id: 9, lat: '-8.50001', lon: '115.20001', display_name: 'Warung Sari, Ubud, Bali', name: 'Warung Sari' }))
    const hit = await nominatim().reverse({ lat: -8.5, lng: 115.2 })
    expect(hit).toEqual({ id: 'osm:9', name: 'Warung Sari', address: 'Warung Sari, Ubud, Bali', point: { lat: -8.5, lng: 115.2 } })
    const u = new URL((fetchMock.mock.calls[0] as [string])[0])
    expect(u.pathname).toBe('/reverse')
    expect(u.searchParams.get('lat')).toBe('-8.5')
    expect(u.searchParams.get('lon')).toBe('115.2')
    expect(u.searchParams.get('format')).toBe('jsonv2')
  })

  it('answers undefined for a spot the geocoder does not know', async () => {
    stub(() => Response.json({ error: 'Unable to geocode' }))
    expect(await nominatim().reverse({ lat: 0, lng: 0 })).toBeUndefined()
  })

  it('reports a failed request instead of inventing places', async () => {
    stub(() => new Response('busy', { status: 503 }))
    await expect(nominatim().search('beach')).rejects.toThrow('503')
  })

  it('spaces requests at least a second apart, in order', async () => {
    const svc = nominatim()
    const sent: number[] = []
    stub(() => { sent.push(Date.now()); return Response.json([row(1)]) })
    const all = Promise.all([svc.search('one'), svc.search('two'), svc.reverse(bali)])
    await vi.advanceTimersByTimeAsync(5000)
    await all
    expect(sent).toHaveLength(3)
    expect(sent[1]! - sent[0]!).toBeGreaterThanOrEqual(MIN_GAP_MS)
    expect(sent[2]! - sent[1]!).toBeGreaterThanOrEqual(MIN_GAP_MS)
    expect(fetchMock.mock.calls.map((c) => new URL(String(c[0])).searchParams.get('q'))).toEqual(['one', 'two', null])
  })

  it('never sends a request that was cancelled while it waited', async () => {
    const svc = nominatim()
    await svc.search('first') // starts the clock: the next one has to wait
    const ctl = new AbortController()
    const waiting = svc.search('second', undefined, ctl.signal)
    const rejected = expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(300)
    ctl.abort()
    await rejected
    const third = svc.search('third')
    await vi.advanceTimersByTimeAsync(3000)
    await third
    expect(fetchMock.mock.calls.map((c) => new URL(String(c[0])).searchParams.get('q'))).toEqual(['first', 'third'])
  })

  it('does not send a request whose signal is already aborted', async () => {
    const ctl = new AbortController()
    ctl.abort()
    await expect(nominatim().search('beach', undefined, ctl.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('carries on after a failed request', async () => {
    const svc = nominatim()
    stub(() => new Response('x', { status: 500 }))
    const bad = expect(svc.search('one')).rejects.toThrow()
    await bad
    stub()
    const next = svc.search('two')
    await vi.advanceTimersByTimeAsync(2000)
    expect((await next).length).toBe(1)
  })
})

describe('choosing the geocoder by environment', () => {
  it('defaults to the demo catalogue and accepts live', () => {
    expect(parseEnv({}).geocoding).toBe('mock')
    expect(parseEnv({ VITE_GEOCODING: 'live' }).geocoding).toBe('live')
    expect(() => parseEnv({ VITE_GEOCODING: 'google' })).toThrow('Invalid environment configuration')
  })
})
