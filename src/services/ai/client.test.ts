import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { catalogueFor } from '@/features/ai/catalogue'
import { buildTripContext } from '@/features/ai/context'
import { parseEnv } from '@/config/env'
import { settle } from '@/test/settle'
import { createAiClient } from './client'
import { AIQuotaError, AIUnavailableError } from './types'

const ndjson = (events: unknown[]) => new Response(events.map((e) => JSON.stringify(e)).join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } })

function stubFetch(reply: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => reply(String(input), init ?? {}))
  vi.stubGlobal('fetch', fn)
  return fn
}
const collect = async (it: AsyncIterable<unknown>) => { const out: unknown[] = []; for await (const e of it) out.push(e); return out }

afterEach(() => vi.unstubAllGlobals())

describe('the assistant client', () => {
  it('sends who is asking and the places it may recommend, and reads the stream', async () => {
    const fetchMock = stubFetch(() => ndjson([{ type: 'token', text: 'Hi' }, { type: 'done' }]))
    const ai = createAiClient({ getToken: async () => 'tok-123', catalogue: async (id) => [{ id: 'p1', name: 'Temple', kind: 'attraction', tags: [], lat: 1, lng: 2, destinationFor: id } as never] })
    const events = await collect(ai.streamChat({ conversationId: 'c1', messages: [{ role: 'user', content: 'hello' }], context: { destination: { id: 'bali', name: 'Bali' } } as never }))
    expect(events).toEqual([{ type: 'token', text: 'Hi' }, { type: 'done' }])
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/ai/chat')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123')
    expect(JSON.parse(String(init.body)).catalogue[0]).toMatchObject({ id: 'p1', destinationFor: 'bali' })
  })

  it('sends nothing extra on the demo backend', async () => {
    const fetchMock = stubFetch(() => ndjson([{ type: 'done' }]))
    await collect(createAiClient().streamChat({ conversationId: 'c1', messages: [{ role: 'user', content: 'hi' }] }))
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(JSON.parse(String(init.body)).catalogue).toBeUndefined()
  })

  it('tells the screens when the day’s allowance is used up, and when the assistant is just unavailable', async () => {
    const ai = createAiClient({ getToken: async () => 't' })
    stubFetch(() => Response.json({ error: 'daily_limit' }, { status: 429 }))
    await expect(collect(ai.streamChat({ conversationId: 'c', messages: [{ role: 'user', content: 'x' }] }))).rejects.toBeInstanceOf(AIQuotaError)
    await expect(ai.generateItinerary({ destinationId: 'bali', days: 2, interests: [] })).rejects.toBeInstanceOf(AIQuotaError)
    await expect(ai.regenerateDay({ destinationId: 'bali', days: 1, interests: [], dayNumber: 1, current: [] })).rejects.toBeInstanceOf(AIQuotaError)

    stubFetch(() => Response.json({ error: 'sign_in_required' }, { status: 401 }))
    const failure = collect(ai.streamChat({ conversationId: 'c', messages: [{ role: 'user', content: 'x' }] }))
    await expect(failure).rejects.toBeInstanceOf(AIUnavailableError)
    await expect(failure).rejects.not.toBeInstanceOf(AIQuotaError)
    stubFetch(() => { throw new TypeError('Failed to fetch') })
    await expect(ai.generateItinerary({ destinationId: 'bali', days: 2, interests: [] })).rejects.toBeInstanceOf(AIUnavailableError)
  })
})

describe('what the assistant is told about the app', () => {
  beforeEach(async () => { await settle(); await resetDemoData() })

  it('sends a trimmed, best-first list of real places for the destination', async () => {
    const list = await catalogueFor('bali')
    expect(list.length).toBeGreaterThan(10)
    expect(list.length).toBeLessThanOrEqual(85)
    expect(list.some((p) => p.kind === 'airport' || p.kind === 'transport')).toBe(false)
    expect(list.some((p) => p.kind === 'restaurant')).toBe(true)
    const stored = new Set((await db.places.where('destinationId').equals('bali').toArray()).map((p) => p.id))
    expect(list.every((p) => stored.has(p.id))).toBe(true)
    expect(list[0]).toMatchObject({ id: expect.any(String), name: expect.any(String), lat: expect.any(Number), lng: expect.any(Number) })
    expect(await catalogueFor('nowhere')).toEqual([])
  })

  it('sends every day of the plan so the assistant can move and reorder across days', async () => {
    const trip = (await db.trips.get('trip-bali'))!
    const days = await db.days.where('tripId').equals('trip-bali').toArray()
    const items = await db.items.where('tripId').equals('trip-bali').toArray()
    const ctx = buildTripContext(trip, { days, items, bookings: [] } as never, undefined, new Date('2026-10-05T00:00:00Z'))
    expect(ctx.plan).toHaveLength(5)
    expect(ctx.plan![0]!.items.length).toBeGreaterThan(0)
    expect(ctx.plan![0]!.items[0]).toEqual({ id: expect.any(String), title: expect.any(String), startTime: expect.stringMatching(/^\d\d:\d\d$/), durationMin: expect.any(Number) })
    expect(JSON.stringify(ctx)).not.toContain('notes') // private notes never leave the device
  })
})

describe('choosing the real assistant by environment', () => {
  it('defaults to the demo replies and accepts live', () => {
    expect(parseEnv({}).ai).toBe('mock')
    expect(parseEnv({ VITE_AI: 'live' }).ai).toBe('live')
    expect(() => parseEnv({ VITE_AI: 'gemini' })).toThrow('Invalid environment configuration')
  })
})
