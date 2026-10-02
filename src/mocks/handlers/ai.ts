import { delay, http, HttpResponse } from 'msw'
import { db } from '@/data/db'
import { itemCategoryForPlace } from '@/features/itinerary/placeCategory'
import { haversineKm } from '@/lib/geo'
import type { TripContext } from '@/services/ai/types'
import type { AIAction, GeoPoint, ItineraryItem, NewDayInput, NewItemInput, Place } from '@/types'

/**
 * Stand-in for the AI backend proxy. It never touches a real model: it matches simple intents in the last
 * message, reads the seeded catalogue and returns structured, schema-valid actions. A real proxy would keep
 * the provider key server-side and return the same stream shape.
 */
const SLOTS = ['09:30', '12:30', '15:00', '18:00']
const unavailable = () => {
  try { return localStorage.getItem('mock-ai-unavailable') === '1' } catch { return false }
}

const toItem = (p: Place, startTime: string): NewItemInput => ({
  title: p.name, startTime, durationMin: p.typicalDurationMin ?? 90, category: itemCategoryForPlace(p), placeId: p.id, description: p.description, estimatedCost: p.costEstimate,
})

async function placesFor(destinationId: string): Promise<Place[]> {
  return (await db.places.where('destinationId').equals(destinationId).toArray()).filter((p) => p.kind !== 'airport' && p.kind !== 'transport')
}

const score = (p: Place, interests: string[]) => p.tags.filter((t) => interests.includes(t)).length * 2 + (p.rating ?? 0)

function buildDays(places: Place[], days: number, interests: string[], offset = 0): NewDayInput[] {
  if (places.length === 0) return []
  const ranked = [...places].sort((a, b) => score(b, interests) - score(a, interests))
  const per = Math.max(2, Math.min(4, Math.ceil(ranked.length / Math.max(days, 1))))
  return Array.from({ length: days }, (_, d) => ({
    title: `Day ${d + 1}`,
    items: Array.from({ length: per }, (_, i) => ranked[(d * per + i + offset) % ranked.length]!).map((p, i) => toItem(p, SLOTS[i] ?? '18:00')),
  }))
}

/** "day 3", "tomorrow" (the day after today's trip day), otherwise the day the user is on. */
function dayFor(q: string, ctx?: TripContext): number {
  const max = ctx?.days ?? 7
  const named = /day\s*(\d+)/.exec(q)
  const n = named ? Number(named[1]) : /tomorrow/.test(q) ? (ctx?.currentDay ?? 0) + 1 : (ctx?.focusDay ?? 1)
  return Math.max(1, Math.min(max, n))
}

async function itemsOfDay(ctx: TripContext | undefined, dayNumber: number): Promise<ItineraryItem[]> {
  if (!ctx) return []
  const day = await db.days.where('[tripId+dayNumber]').equals([ctx.trip.id, dayNumber]).first()
  return day ? (await db.items.where('dayId').equals(day.id).toArray()).sort((a, b) => a.position - b.position) : []
}

async function referencePoint(q: string, ctx: TripContext | undefined, places: Place[]): Promise<{ point?: GeoPoint; label: string }> {
  if (/flight|airport/.test(q)) {
    const airport = (await db.places.toArray()).find((p) => p.kind === 'airport' && p.destinationId === ctx?.destination?.id)
    if (airport) return { point: airport.location, label: 'the airport' }
  }
  const last = [...(ctx?.items ?? [])].reverse().find((i) => i.placeId)
  const place = last?.placeId ? places.find((p) => p.id === last.placeId) ?? (await db.places.get(last.placeId)) : undefined
  if (place) return { point: place.location, label: place.name }
  const dest = ctx?.destination ? await db.destinations.get(ctx.destination.id) : undefined
  return { point: dest?.location, label: dest ? `central ${dest.name}` : 'you' }
}

const nearest = (from: GeoPoint, places: Place[], n = 3) => [...places].sort((a, b) => haversineKm(from, a.location) - haversineKm(from, b.location)).slice(0, n)

/** Nearest-neighbour ordering starting from the first stop; stops without a location stay at the end. */
async function optimiseOrder(items: ItineraryItem[]): Promise<string[]> {
  const located: Array<{ id: string; point: GeoPoint }> = []
  const rest: string[] = []
  for (const i of items) {
    const point = i.customLocation?.point ?? (i.placeId ? (await db.places.get(i.placeId))?.location : undefined)
    point ? located.push({ id: i.id, point }) : rest.push(i.id)
  }
  const order = located.splice(0, 1)
  while (located.length) {
    const here = order[order.length - 1]!.point
    located.sort((a, b) => haversineKm(here, a.point) - haversineKm(here, b.point))
    order.push(located.shift()!)
  }
  return [...order.map((o) => o.id), ...rest]
}

interface Reply { text: string; actions: AIAction[] }

async function reply(prompt: string, ctx?: TripContext): Promise<Reply> {
  const q = prompt.toLowerCase()
  const where = ctx?.destination?.name ?? 'your destination'
  const places = await placesFor(ctx?.destination?.id ?? 'bali')
  const day = dayFor(q, ctx)
  const evening = /evening|tonight|sunset/.test(q)

  if (/sunset|viewpoint|evening/.test(q) && !/restaurant|dinner/.test(q)) {
    const picks = places.filter((p) => p.tags.includes('sunset')).slice(0, 3)
    if (picks.length === 0) return { text: `I don’t have sunset spots for ${where} yet.`, actions: [] }
    return {
      text: `I found ${picks.length} sunset spots in ${where}: ${picks.map((p) => p.name).join(', ')}. ${picks[0]!.name} suits Day ${day} best${ctx?.hotelName ? `, and it’s an easy trip from ${ctx.hotelName}` : ''}. Nothing is added until you choose.`,
      actions: [{ type: 'SUGGEST_PLACES', placeIds: picks.map((p) => p.id) }, { type: 'ADD_ACTIVITY', dayNumber: day, item: toItem(picks[0]!, '17:30') }],
    }
  }
  if (/optimi[sz]e|route|fit .*(places|three)|afternoon|efficient/.test(q)) {
    const items = await itemsOfDay(ctx, day)
    if (items.length < 3) return { text: `Day ${day} has ${items.length === 0 ? 'nothing' : 'only a couple of stops'} to reorder yet.`, actions: [] }
    const order = await optimiseOrder(items)
    const same = order.every((id, i) => id === items[i]!.id)
    return {
      text: same ? `Day ${day} is already in a sensible order — each stop is close to the next.` : `Here’s a shorter route for Day ${day}: it cuts back-and-forth driving by visiting stops in order of proximity. Start times stay the same, so check them after applying.`,
      actions: same ? [] : [{ type: 'OPTIMIZE_ROUTE', dayNumber: day, itemIds: order }],
    }
  }
  if (/early|wake|rearrange|sleep in|late start/.test(q)) {
    const items = await itemsOfDay(ctx, day)
    const first = items[0]
    if (!first || day >= (ctx?.days ?? day)) return { text: first ? `Day ${day} is the last day, so there’s nowhere to move “${first.title}”. I’d suggest pushing its start time later instead.` : `Day ${day} is empty.`, actions: [] }
    return {
      text: `To ease into Day ${day}, I’d move “${first.title}” (${first.startTime}) to Day ${day + 1}. Then your first stop is later in the morning. You can undo it.`,
      actions: [{ type: 'MOVE_ACTIVITY', itemId: first.id, toDayNumber: day + 1, position: 0 }],
    }
  }
  if (/vegetarian|vegan|restaurant|eat|dinner|lunch|food|hungry/.test(q)) {
    const veg = /vegetarian|vegan/.test(q)
    let pool = places.filter((p): p is Place & { kind: 'restaurant' } => p.kind === 'restaurant').filter((p) => !veg || 'dietary' in p && (p.dietary.includes('vegetarian') || p.dietary.includes('vegan')))
    const ref = /near|nearby|around|close/.test(q) ? await referencePoint(q, ctx, places) : undefined
    if (ref?.point) pool = nearest(ref.point, pool, 3) as typeof pool
    const picks = pool.slice(0, 3)
    if (picks.length === 0) return { text: `I couldn’t find ${veg ? 'vegetarian ' : ''}restaurants for ${where} in my data yet.`, actions: [] }
    return { text: `${veg ? 'Vegetarian-friendly' : 'Well-reviewed'} places${ref ? ` near ${ref.label}` : ` in ${where}`}: ${picks.map((p) => p.name).join(', ')}.`, actions: [{ type: 'FIND_RESTAURANTS', placeIds: picks.map((p) => p.id) }] }
  }
  if (/near|nearby|around|close|hours? (before|until)|before my flight/.test(q)) {
    const ref = await referencePoint(q, ctx, places)
    const quick = /hours?/.test(q) ? places.filter((p) => (p.typicalDurationMin ?? 90) <= 120) : places
    const picks = ref.point ? nearest(ref.point, quick, 3) : quick.slice(0, 3)
    if (picks.length === 0) return { text: `I don’t have places for ${where} yet.`, actions: [] }
    return { text: `Closest to ${ref.label}: ${picks.map((p) => `${p.name}${ref.point ? ` (${haversineKm(ref.point, p.location).toFixed(1)} km)` : ''}`).join(', ')}.`, actions: [{ type: 'SUGGEST_PLACES', placeIds: picks.map((p) => p.id) }] }
  }
  if (/hectic|busy|relax|less|slow|packed/.test(q)) {
    const items = await itemsOfDay(ctx, day)
    const last = items[items.length - 1]
    return last
      ? { text: `Day ${day} has ${items.length} stops. I’d drop “${last.title}” and leave a freer evening. Nothing changes until you confirm, and you can undo it.`, actions: [{ type: 'REMOVE_ACTIVITY', itemId: last.id }] }
      : { text: `Day ${day} is already empty.`, actions: [] }
  }
  if (/plan|itinerary|create|generate|days|trip to|what should i do/.test(q) && !/next/.test(q)) {
    const m = /(\d+)[- ]day/.exec(q) ?? /for (\d+) days/.exec(q)
    const n = Math.min(m ? Number(m[1]) : ctx?.days ?? 3, 7)
    const preview = buildDays(places, n, ctx?.trip.interests ?? [])
    if (preview.length === 0) return { text: `I don’t have place data for ${where} yet, so I can’t draft days.`, actions: [] }
    return { text: `Here’s a ${preview.length}-day draft for ${where}${ctx ? ' built around your interests' : ''}. Review it, then add it to your trip — I won’t change anything until you do.`, actions: ctx ? [{ type: 'CREATE_ITINERARY', days: preview }] : [] }
  }
  const next = ctx?.upcoming[0]
  void evening
  return {
    text: next
      ? `${ctx?.currentDay ? `You’re on Day ${ctx.currentDay}. ` : ''}${ctx?.completed.length ? `You’ve done ${ctx.completed[ctx.completed.length - 1]}. ` : ''}Next up is ${next}. Want something nearby to add before or after it?`
      : `I can plan days, find restaurants or sunset spots, tidy a busy day, or find things near you. What would help most for ${where}?`,
    actions: [],
  }
}

const enc = new TextEncoder()
const line = (o: unknown) => enc.encode(JSON.stringify(o) + '\n')

export const aiHandlers = [
  http.post('*/api/ai/chat', async ({ request }) => {
    await delay(250)
    if (unavailable()) return HttpResponse.json({ error: 'unavailable' }, { status: 503 })
    const body = (await request.json()) as { messages: { role: string; content: string }[]; context?: TripContext }
    const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    const r = await reply(lastUser, body.context)
    const stream = new ReadableStream({
      async start(c) {
        for (const word of r.text.split(/(\s+)/)) {
          c.enqueue(line({ type: 'token', text: word }))
          await new Promise((res) => setTimeout(res, 18))
        }
        for (const action of r.actions) c.enqueue(line({ type: 'action', action }))
        c.enqueue(line({ type: 'done' }))
        c.close()
      },
    })
    return new HttpResponse(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })
  }),

  http.post('*/api/ai/itinerary', async ({ request }) => {
    await delay(900)
    if (unavailable()) return HttpResponse.json({ error: 'unavailable' }, { status: 503 })
    const b = (await request.json()) as { destinationId: string; days: number; interests: string[] }
    const places = await placesFor(b.destinationId)
    if (!places.length) return HttpResponse.json({ days: [], summary: 'No places available yet for this destination.' })
    return HttpResponse.json({ days: buildDays(places, b.days, b.interests), summary: `A ${b.days}-day plan balancing your interests.` })
  }),

  http.post('*/api/ai/regenerate-day', async ({ request }) => {
    await delay(700)
    if (unavailable()) return HttpResponse.json({ error: 'unavailable' }, { status: 503 })
    const b = (await request.json()) as { destinationId: string; dayNumber: number; interests: string[]; current: string[] }
    const all = await placesFor(b.destinationId)
    const fresh = all.filter((p) => !b.current.includes(p.name))
    const [after] = buildDays(fresh.length >= 3 ? fresh : all, 1, b.interests, b.dayNumber)
    return HttpResponse.json({ dayNumber: b.dayNumber, before: b.current, after: after ?? { items: [] } })
  }),
]
