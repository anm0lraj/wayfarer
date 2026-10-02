import { daysBetween } from '@/lib/dates'
import type { HotelQuery } from '@/services/bookings/types'
import type { Hotel, Money, Trip } from '@/types'

export type HotelSort = NonNullable<HotelQuery['sort']>

/** Filters + stay, as they appear in the URL (`?maxPrice=…&amenities=Pool,Spa`). */
export interface HotelSearchState {
  checkIn: string
  checkOut: string
  guests: number
  maxPrice?: number
  minRating?: number
  maxDistanceKm?: number
  amenities: string[]
  propertyTypes: string[]
  sort: HotelSort
}

const SORTS: HotelSort[] = ['recommended', 'price', 'rating', 'distance']
const num = (v: string | null) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : undefined)
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

/** Reads the search from the URL; anything missing falls back to the trip's own dates and party size. */
export function parseHotelSearch(p: URLSearchParams, trip: Pick<Trip, 'startDate' | 'endDate' | 'travellers'>): HotelSearchState {
  const sort = p.get('sort') as HotelSort | null
  return {
    checkIn: p.get('checkIn') || trip.startDate,
    checkOut: p.get('checkOut') || trip.endDate,
    guests: num(p.get('guests')) ?? trip.travellers.count,
    maxPrice: num(p.get('maxPrice')),
    minRating: num(p.get('minRating')),
    maxDistanceKm: num(p.get('maxDistanceKm')),
    amenities: list(p.get('amenities')),
    propertyTypes: list(p.get('types')),
    sort: sort && SORTS.includes(sort) ? sort : 'recommended',
  }
}

/** Writes only what differs from the defaults, so the URL stays short and shareable. */
export function serializeHotelSearch(s: HotelSearchState, trip: Pick<Trip, 'startDate' | 'endDate' | 'travellers'>): URLSearchParams {
  const p = new URLSearchParams()
  if (s.checkIn !== trip.startDate) p.set('checkIn', s.checkIn)
  if (s.checkOut !== trip.endDate) p.set('checkOut', s.checkOut)
  if (s.guests !== trip.travellers.count) p.set('guests', String(s.guests))
  if (s.maxPrice) p.set('maxPrice', String(s.maxPrice))
  if (s.minRating) p.set('minRating', String(s.minRating))
  if (s.maxDistanceKm) p.set('maxDistanceKm', String(s.maxDistanceKm))
  if (s.amenities.length) p.set('amenities', s.amenities.join(','))
  if (s.propertyTypes.length) p.set('types', s.propertyTypes.join(','))
  if (s.sort !== 'recommended') p.set('sort', s.sort)
  return p
}

export function toHotelQuery(destinationId: string, s: HotelSearchState): HotelQuery {
  return {
    destinationId, checkIn: s.checkIn, checkOut: s.checkOut, guests: s.guests, maxPrice: s.maxPrice, minRating: s.minRating,
    maxDistanceKm: s.maxDistanceKm, amenities: s.amenities, propertyTypes: s.propertyTypes, sort: s.sort,
  }
}

export const activeFilterCount = (s: HotelSearchState) =>
  [s.maxPrice, s.minRating, s.maxDistanceKm].filter(Boolean).length + s.amenities.length + s.propertyTypes.length

export const nightsBetween = (checkIn: string, checkOut: string) => Math.max(1, daysBetween(checkIn, checkOut))

export const stayTotal = (perNight: Money, nights: number): Money => ({ amount: perNight.amount * nights, currency: perNight.currency })

/** A stay is valid when check-out is after check-in. */
export const validStay = (s: Pick<HotelSearchState, 'checkIn' | 'checkOut'>) => daysBetween(s.checkIn, s.checkOut) >= 1

/** Filter choices come from the hotels themselves, so they never offer something with no results. */
export function filterOptions(hotels: Hotel[]) {
  const uniq = (xs: string[]) => [...new Set(xs)].sort()
  return { amenities: uniq(hotels.flatMap((h) => h.amenities)), propertyTypes: uniq(hotels.map((h) => h.propertyType)) }
}
