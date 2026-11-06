import { transitCity, TRANSIT_CITIES } from '@/data/transitCities'
import type { NewBookingInput } from '@/data/repositories/bookingRepo'
import type { Booking, Trip, TransitDetails, TransitMode, TransitService } from '@/types'

export const TIMETABLE_NOTICE = 'Sample timetable for the demo. Times and fares are not live.'

export const MODE_COPY: Record<TransitMode, { plural: string; noun: string; title: string }> = {
  train: { plural: 'trains', noun: 'train', title: 'Trains' },
  bus: { plural: 'buses', noun: 'bus', title: 'Buses' },
}

export type TransitSort = 'departure' | 'price' | 'duration'
export const SORTS: Array<{ value: TransitSort; label: string }> = [
  { value: 'departure', label: 'Earliest' }, { value: 'price', label: 'Cheapest' }, { value: 'duration', label: 'Fastest' },
]

export interface TransitSearchState {
  from: string
  to: string
  date: string
  travellers: number
  sort: TransitSort
}

/** First search for a trip: the city its first destination is in, from the city trips there usually start from. */
export function transitDefaults(trip: Pick<Trip, 'destinationIds' | 'startDate' | 'travellers'>): Omit<TransitSearchState, 'sort'> {
  const dest = transitCity(trip.destinationIds[0]) ?? TRANSIT_CITIES[0]!
  const from = transitCity(dest.startsFrom)?.id ?? TRANSIT_CITIES.find((c) => c.id !== dest.id)!.id
  return { from, to: dest.id, date: trip.startDate, travellers: trip.travellers.count }
}

/** Reads `?from&to&date&travellers&sort`; anything missing or not understood falls back to the trip's defaults. */
export function parseTransitParams(params: URLSearchParams, trip: Pick<Trip, 'destinationIds' | 'startDate' | 'travellers'>): TransitSearchState {
  const d = transitDefaults(trip)
  const city = (v: string | null, fallback: string) => (v && transitCity(v) ? v : fallback)
  const date = params.get('date')
  const travellers = Math.floor(Number(params.get('travellers')))
  const sort = params.get('sort')
  return {
    from: city(params.get('from'), d.from),
    to: city(params.get('to'), d.to),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : d.date,
    travellers: travellers >= 1 && travellers <= 9 ? travellers : Math.min(9, d.travellers),
    sort: SORTS.some((s) => s.value === sort) ? (sort as TransitSort) : 'departure',
  }
}

const SORT_KEY: Record<TransitSort, (s: TransitService) => string | number> = {
  departure: (s) => s.departAt.slice(11, 16),
  price: (s) => s.price.amount,
  duration: (s) => s.durationMin,
}

/** A sorted copy; ties fall back to the earlier departure. */
export function sortServices(list: TransitService[], sort: TransitSort): TransitService[] {
  const key = SORT_KEY[sort]
  return [...list].sort((a, b) => {
    const x = key(a)
    const y = key(b)
    return (x < y ? -1 : x > y ? 1 : 0) || a.departAt.slice(11, 16).localeCompare(b.departAt.slice(11, 16))
  })
}

/** What gets saved to the trip for a search result, priced for the whole party. Saving is always a demo entry. */
export function transitBookingInput(s: TransitService, tripId: string, travellers: number): Omit<NewBookingInput, 'provider'> & { refId: string; type: Booking['type'] } {
  const details: TransitDetails = {
    serviceId: s.id, operator: s.operator, number: s.number, from: s.from, to: s.to, departAt: s.departAt, arriveAt: s.arriveAt,
    durationMin: s.durationMin, seatClass: s.seatClass, pricePerPerson: s.price, travellers, ...(s.note ? { note: s.note } : {}),
  }
  return {
    tripId, type: s.mode, refId: s.id, title: `${s.name} (${s.number}) · ${s.from.code} → ${s.to.code}`,
    price: { ...s.price, amount: s.price.amount * travellers }, startAt: s.departAt, endAt: s.arriveAt, details,
  }
}
