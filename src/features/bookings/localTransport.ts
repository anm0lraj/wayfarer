import { fareTableFor, INR_PER_UNIT, METRO, type LocalMode, type ModeFare } from '@/data/fares'
import { haversineKm } from '@/lib/geo'
import { endTime } from '@/features/itinerary/schedule'
import type { GeoPoint, ItineraryItem, Money, NewItemInput } from '@/types'

/** Straight-line distance × this ≈ distance by road. */
export const ROAD_FACTOR = 1.3
/** Beyond this road distance local transport is the wrong tool: look at flights, trains or buses. */
export const LOCAL_MAX_KM = 350
/** Metered modes are shown as the typical fare ±20%. */
const SPREAD = 0.2

export const LOCAL_MODE_LABEL: Record<LocalMode, string> = {
  cab: 'Cab', auto: 'Auto-rickshaw', ride_hailing: 'Ride-hailing', scooter: 'Scooter hire', metro: 'Metro', city_bus: 'City bus',
}
const NOTE: Partial<Record<LocalMode, string>> = {
  cab: 'Metered or agreed taxi', ride_hailing: 'Booked in an app such as Uber, Ola, Grab or GO', scooter: 'Day rate plus fuel; you ride', city_bus: 'Published fare band',
}

/** One way of getting between two points. Everything here is an estimate, never a quote and never bookable. */
export interface LocalOption {
  mode: LocalMode
  label: string
  note?: string
  minutes: number
  /** In INR, rounded. `min === max` for a fixed published fare. */
  fare: { min: Money; typical: Money; max: Money }
}

export interface LocalEstimate {
  roadKm: number
  /** Over `LOCAL_MAX_KM`: no options, say so and point to flights. */
  tooFar: boolean
  options: LocalOption[]
}

export const roadKm = (from: GeoPoint, to: GeoPoint): number => Math.round(haversineKm(from, to) * ROAD_FACTOR * 10) / 10

/** Nearest 5 under 100, nearest 10 above: an estimate shouldn't look precise. */
const roundInr = (n: number): number => (n < 100 ? Math.round(n / 5) * 5 : Math.round(n / 10) * 10)
const inr = (amount: number): Money => ({ amount: roundInr(amount), currency: 'INR' })

const bandFor = (fare: Extract<ModeFare, { kind: 'banded' }>, km: number) => fare.bands.find(([upTo]) => km <= upTo) ?? fare.bands[fare.bands.length - 1]!

/** Price range in the table's own currency for this distance, or undefined when the mode doesn't go that far. */
function localFare(fare: ModeFare, km: number): { min: number; typical: number; max: number } | undefined {
  if (km > fare.maxKm) return undefined
  if (fare.kind === 'banded') {
    const [, min, max] = bandFor(fare, km)
    return { min, typical: (min + max) / 2, max }
  }
  const typical = Math.max(fare.minFare, fare.base + fare.perKm * km)
  return { min: typical * (1 - SPREAD), typical, max: typical * (1 + SPREAD) }
}

export function travelMinutes(fare: ModeFare, km: number): number {
  const speed = km > 15 && fare.highwayKmh ? fare.highwayKmh : fare.kmh
  return Math.round(fare.overheadMin + (km / speed) * 60)
}

/** Estimate for one mode, in INR; undefined when the mode is out of range. */
export function estimateMode(mode: LocalMode, fare: ModeFare, currency: string, km: number): LocalOption | undefined {
  const f = localFare(fare, km)
  if (!f) return undefined
  const rate = INR_PER_UNIT[currency] ?? INR_PER_UNIT.USD!
  return { mode, label: LOCAL_MODE_LABEL[mode], note: NOTE[mode], minutes: travelMinutes(fare, km), fare: { min: inr(f.min * rate), typical: inr(f.typical * rate), max: inr(f.max * rate) } }
}

/**
 * Local ways to get between two points in `placeId` (a destination or transit-city id, which picks the fare table).
 * Modes beyond their own range are dropped; metro only appears where one exists. Cheapest typical fare first.
 */
export function localOptions(from: GeoPoint, to: GeoPoint, placeId: string | undefined): LocalEstimate {
  const km = roadKm(from, to)
  if (km > LOCAL_MAX_KM) return { roadKm: km, tooFar: true, options: [] }
  const { table } = fareTableFor(placeId)
  const options: LocalOption[] = []
  for (const [mode, fare] of Object.entries(table.modes) as Array<[LocalMode, ModeFare]>) {
    const o = estimateMode(mode, fare, table.currency, km)
    if (o) options.push(o)
  }
  const metro = placeId ? METRO[placeId] : undefined
  const m = metro && estimateMode('metro', metro.fare, metro.currency, km)
  if (m) options.push(m)
  return { roadKm: km, tooFar: false, options: options.sort((a, b) => a.fare.typical.amount - b.fare.typical.amount) }
}

export const minutesText = (min: number): string => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`)

/** When a stop inserted at `atIndex` starts: as the stop before it ends, or 09:00 at the start of a day. */
export function insertStartTime(dayItems: Array<Pick<ItineraryItem, 'startTime' | 'durationMin'>>, atIndex: number): string {
  const prev = dayItems[atIndex - 1]
  return prev ? endTime(prev) : '09:00'
}

/** "₹200–₹300", or "₹30" when the fare is fixed. */
export function fareRangeText(o: LocalOption, format: (m: Money) => string): string {
  return o.fare.min.amount === o.fare.max.amount ? format(o.fare.typical) : `${format(o.fare.min)}–${format(o.fare.max)}`
}

/**
 * An itinerary stop for a local option: a `transport` item with the typical fare as its cost and no location of
 * its own (so the legs around it keep measuring between the real places). It is a plan entry, not a booking.
 */
export function localOptionStop(o: LocalOption, from: string, to: string, startTime: string): NewItemInput {
  return {
    title: `${o.label}: ${from} → ${to}`,
    startTime,
    durationMin: Math.max(5, o.minutes),
    category: 'transport',
    estimatedCost: o.fare.typical,
    description: 'Estimated fare and time. Not a quote, and nothing is booked.',
  }
}
