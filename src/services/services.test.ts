import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { installMockApi } from '@/mocks/install'
import { resetDemoData } from '@/data/seed'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import { aiService } from './ai/mock'
import { AIUnavailableError, type AIStreamEvent } from './ai/types'
import { bookingService } from './bookings/mock'
import { weatherService } from './weather/mock'
import { aiActionSchema } from '@/types'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  setActorId(DEMO_USER_ID)
  await resetDemoData()
})

async function collect(it: AsyncIterable<AIStreamEvent>) {
  const out: AIStreamEvent[] = []
  for await (const e of it) out.push(e)
  return out
}

const context = {
  trip: { id: 'trip-bali', title: '5 Days in Bali', startDate: '2026-10-12', endDate: '2026-10-16', travellers: { group: 'couple' as const, count: 2 }, budget: { tier: 'comfort' as const }, interests: ['food' as const] },
  destination: { id: 'bali', name: 'Bali' }, today: '2026-10-14', days: 5, currentDay: 3, focusDay: 3, completed: [], upcoming: [],
}

describe('AI service (via mocked backend proxy)', () => {
  it('streams tokens and returns Zod-valid actions', async () => {
    const events = await collect(aiService.streamChat({ conversationId: 'c', messages: [{ role: 'user', content: 'Add a sunset viewpoint to Day 3' }], context }))
    expect(events.filter((e) => e.type === 'token').length).toBeGreaterThan(3)
    const actions = events.filter((e) => e.type === 'action')
    expect(actions.length).toBeGreaterThan(0)
    for (const a of actions) expect(() => aiActionSchema.parse((a as { action: unknown }).action)).not.toThrow()
    expect(events.at(-1)).toEqual({ type: 'done' })
  })

  it('throws AIUnavailableError when the backend is down', async () => {
    localStorage.setItem('mock-ai-unavailable', '1')
    await expect(collect(aiService.streamChat({ conversationId: 'c', messages: [{ role: 'user', content: 'hi' }] }))).rejects.toBeInstanceOf(AIUnavailableError)
    await expect(aiService.generateItinerary({ destinationId: 'bali', days: 2, interests: [] })).rejects.toBeInstanceOf(AIUnavailableError)
  })

  it('generates an itinerary preview without writing any data', async () => {
    const preview = await aiService.generateItinerary({ destinationId: 'bali', days: 3, interests: ['food', 'beaches'] })
    expect(preview.days).toHaveLength(3)
    expect(preview.days[0]!.items.length).toBeGreaterThan(1)
  })
})

describe('booking service', () => {
  it('filters hotels and never produces a confirmed live booking', async () => {
    const cheap = await bookingService.searchHotels({ destinationId: 'bali', maxPrice: 4000, sort: 'price' })
    expect(cheap.length).toBeGreaterThan(0)
    expect(cheap.every((h) => h.pricePerNight.amount <= 4000)).toBe(true)
    const result = await bookingService.createBooking({ tripId: 't', type: 'hotel', refId: 'h', title: 'x', price: { amount: 1, currency: 'INR' }, startAt: '2026-10-12T14:00:00+08:00' })
    expect(result).toMatchObject({ mode: 'demo', status: 'saved' })
  })

  it('searches flights by route', async () => {
    const flights = await bookingService.searchFlights({ from: 'BOM', to: 'DPS', date: '2026-10-12' })
    expect(flights.length).toBeGreaterThan(0)
    expect(flights.every((f) => f.from.code === 'BOM' && f.to.code === 'DPS')).toBe(true)
  })
})

describe('weather service', () => {
  it('is deterministic per place and date', async () => {
    const a = await weatherService.getForecast({ lat: -8.69, lng: 115.17 }, '2026-10-12', '2026-10-16')
    const b = await weatherService.getForecast({ lat: -8.69, lng: 115.17 }, '2026-10-12', '2026-10-16')
    expect(a).toHaveLength(5)
    expect(a).toEqual(b)
  })
})
