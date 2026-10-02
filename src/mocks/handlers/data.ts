import { delay, http, HttpResponse } from 'msw'
import { db } from '@/data/db'
import { publicTripRepo } from '@/data/repositories/publicTripRepo'
import type { DayForecast, WeatherCondition } from '@/services/weather/types'

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0
const CONDITIONS: WeatherCondition[] = ['sunny', 'sunny', 'partly_cloudy', 'partly_cloudy', 'cloudy', 'rain']

function forecastFor(lat: number, lng: number, date: string): DayForecast {
  const h = hash(`${lat.toFixed(1)},${lng.toFixed(1)},${date}`)
  const condition = CONDITIONS[h % CONDITIONS.length]!
  const tropical = Math.abs(lat) < 25
  const base = tropical ? 30 : 18
  return { date, condition, highC: base + (h % 4), lowC: base - 7 + (h % 3), rainChancePct: condition === 'rain' ? 70 : condition === 'cloudy' ? 30 : 10 }
}

function eachDate(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = new Date(start + 'T00:00:00Z'); d <= new Date(end + 'T00:00:00Z') && out.length < 31; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10))
  return out
}

export const dataHandlers = [
  // Stand-in for the sync endpoint. A real backend would compare updatedAt per entity and answer `conflict` with its newer copy.
  http.post('*/api/sync', async ({ request }) => {
    await delay(80)
    const { ops } = (await request.json()) as { ops: Array<{ id: number }> }
    return HttpResponse.json({ results: ops.map((o) => ({ id: o.id, status: 'ok' })) })
  }),


  http.get('*/api/hotels', async ({ request }) => {
    await delay(300)
    const p = new URL(request.url).searchParams
    const list = (p.get('amenities') ?? '').split(',').filter(Boolean)
    const types = (p.get('propertyTypes') ?? '').split(',').filter(Boolean)
    let hotels = await db.hotels.where('destinationId').equals(p.get('destinationId') ?? 'bali').toArray()
    hotels = hotels.filter((h) =>
      (!p.get('minPrice') || h.pricePerNight.amount >= Number(p.get('minPrice'))) &&
      (!p.get('maxPrice') || h.pricePerNight.amount <= Number(p.get('maxPrice'))) &&
      (!p.get('minRating') || h.rating >= Number(p.get('minRating'))) &&
      (!p.get('maxDistanceKm') || h.distanceFromCenterKm <= Number(p.get('maxDistanceKm'))) &&
      list.every((a) => h.amenities.includes(a)) && (!types.length || types.includes(h.propertyType)))
    const sort = p.get('sort')
    if (sort === 'price') hotels.sort((a, b) => a.pricePerNight.amount - b.pricePerNight.amount)
    if (sort === 'rating') hotels.sort((a, b) => b.rating - a.rating)
    if (sort === 'distance') hotels.sort((a, b) => a.distanceFromCenterKm - b.distanceFromCenterKm)
    return HttpResponse.json(hotels)
  }),

  http.get('*/api/hotels/:id', async ({ params }) => {
    await delay(200)
    const h = await db.hotels.get(String(params.id))
    return h ? HttpResponse.json(h) : HttpResponse.json({ error: 'not_found' }, { status: 404 })
  }),

  http.get('*/api/flights', async ({ request }) => {
    await delay(400)
    const p = new URL(request.url).searchParams
    const from = (p.get('from') ?? '').toUpperCase()
    const to = (p.get('to') ?? '').toUpperCase()
    const date = p.get('date') ?? ''
    const all = await db.flights.toArray()
    return HttpResponse.json(all.filter((f) => (!from || f.from.code === from) && (!to || f.to.code === to) && (!date || f.departAt.startsWith(date) || f.arriveAt.startsWith(date))))
  }),

  http.get('*/api/weather/forecast', async ({ request }) => {
    await delay(200)
    const p = new URL(request.url).searchParams
    const lat = Number(p.get('lat'))
    const lng = Number(p.get('lng'))
    return HttpResponse.json(eachDate(p.get('start') ?? '', p.get('end') ?? '').map((d) => forecastFor(lat, lng, d)))
  }),

  http.get('*/api/weather/current', async ({ request }) => {
    await delay(150)
    const p = new URL(request.url).searchParams
    const f = forecastFor(Number(p.get('lat')), Number(p.get('lng')), new Date().toISOString().slice(0, 10))
    return HttpResponse.json({ condition: f.condition, tempC: f.highC - 2 })
  }),

  http.get('*/api/explore/itineraries', async ({ request }) => {
    await delay(350)
    const p = new URL(request.url).searchParams
    return HttpResponse.json(await publicTripRepo.listPage(p.get('cursor'), Number(p.get('limit') ?? 12), { q: p.get('q') ?? undefined, destinationId: p.get('destination') ?? undefined }))
  }),

  http.get('*/api/public-trips/:slug', async ({ params }) => {
    await delay(250)
    const t = await publicTripRepo.getBySlug(String(params.slug))
    return t ? HttpResponse.json(t) : HttpResponse.json({ error: 'not_found' }, { status: 404 })
  }),
]
