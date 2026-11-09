import { transitCity } from './transitCities'

/**
 * Static fare data behind the local-transport ESTIMATES. Bundled, approximate, not live and not bookable.
 * Lookup order: the destination's own table, then its country's, then a generic USD table.
 * Amounts are in each table's own currency; `INR_PER_UNIT` converts for display (the trip currency is INR).
 */
export type LocalMode = 'cab' | 'auto' | 'ride_hailing' | 'scooter' | 'metro' | 'city_bus'

interface Pace {
  /** A mode is dropped when the road distance is beyond this. */
  maxKm: number
  /** Average speed in town; `highwayKmh` takes over beyond 15 km. */
  kmh: number
  highwayKmh?: number
  /** Walking to it, waiting, parking, getting off. */
  overheadMin: number
}
/** Meter or day-rate: base + per km, never below `minFare`; the estimate shows ±20%. */
export interface MeteredFare extends Pace { kind: 'metered'; base: number; perKm: number; minFare: number }
/** Published fare bands (metro, city bus): [up to km, lowest fare, highest fare]. The last band catches the rest. */
export interface BandedFare extends Pace { kind: 'banded'; bands: Array<[upToKm: number, min: number, max: number]> }
export type ModeFare = MeteredFare | BandedFare

export interface FareTable {
  currency: string
  modes: Partial<Record<Exclude<LocalMode, 'metro'>, ModeFare>>
}

export const INR_PER_UNIT: Record<string, number> = { INR: 1, IDR: 0.0053, JPY: 0.58, EUR: 94, USD: 88 }

const metered = (base: number, perKm: number, minFare: number, maxKm: number, kmh: number, overheadMin: number, highwayKmh?: number): MeteredFare =>
  ({ kind: 'metered', base, perKm, minFare, maxKm, kmh, overheadMin, highwayKmh })
const banded = (bands: BandedFare['bands'], maxKm: number, kmh: number, overheadMin: number): BandedFare => ({ kind: 'banded', bands, maxKm, kmh, overheadMin })

const INDIA: FareTable = {
  currency: 'INR',
  modes: {
    cab: metered(60, 16, 150, 350, 24, 10, 50),
    auto: metered(30, 14, 40, 15, 20, 5),
    ride_hailing: metered(50, 13, 90, 60, 24, 8, 45),
    scooter: metered(350, 4, 350, 40, 28, 15),
    city_bus: banded([[5, 10, 20], [10, 15, 30], [20, 20, 45], [40, 30, 60]], 40, 16, 15),
  },
}
const INDONESIA: FareTable = {
  currency: 'IDR',
  modes: {
    cab: metered(15000, 7000, 50000, 350, 24, 10, 45),
    ride_hailing: metered(8000, 4500, 20000, 60, 24, 8, 45),
    scooter: metered(80000, 1500, 80000, 60, 30, 15),
    city_bus: banded([[10, 3500, 4500], [30, 5000, 9000]], 30, 18, 15),
  },
}
/** When nothing better is known. */
const GENERIC: FareTable = {
  currency: 'USD',
  modes: {
    cab: metered(3, 1, 6, 350, 24, 10, 50),
    ride_hailing: metered(2, 0.8, 5, 60, 24, 8, 45),
    scooter: metered(15, 0.1, 15, 40, 28, 15),
    city_bus: banded([[10, 1, 2], [30, 2, 4]], 30, 16, 15),
  },
}

const withModes = (base: FareTable, modes: FareTable['modes']): FareTable => ({ currency: base.currency, modes: { ...base.modes, ...modes } })
const without = (base: FareTable, ...drop: Array<keyof FareTable['modes']>): FareTable => {
  const modes = { ...base.modes }
  for (const d of drop) delete modes[d]
  return { currency: base.currency, modes }
}

const BY_DESTINATION: Record<string, FareTable> = {
  delhi: withModes(INDIA, { ride_hailing: metered(45, 12, 80, 60, 22, 8, 45), auto: metered(30, 11, 40, 15, 18, 5) }),
  jaipur: withModes(INDIA, { cab: metered(50, 15, 130, 350, 24, 10, 50) }),
  udaipur: withModes(INDIA, { cab: metered(60, 17, 150, 350, 26, 10, 50) }),
  jodhpur: withModes(INDIA, { cab: metered(50, 15, 130, 350, 26, 10, 50) }),
  goa: without(withModes(INDIA, { cab: metered(100, 22, 300, 350, 26, 10, 45), scooter: metered(400, 4, 400, 60, 30, 15) }), 'auto', 'ride_hailing'),
  manali: without(withModes(INDIA, { cab: metered(100, 30, 300, 350, 25, 10, 35), scooter: metered(800, 5, 800, 60, 25, 15) }), 'auto', 'ride_hailing'),
  bali: INDONESIA,
  japan: {
    currency: 'JPY',
    modes: {
      cab: metered(500, 400, 1000, 350, 22, 8, 50),
      ride_hailing: metered(500, 380, 900, 60, 22, 8, 45),
      city_bus: banded([[5, 210, 210], [10, 220, 260], [30, 260, 400]], 30, 16, 12),
    },
  },
  paris: {
    currency: 'EUR',
    modes: {
      cab: metered(4, 1.3, 8, 350, 18, 8, 50),
      ride_hailing: metered(3, 1.1, 7, 60, 18, 8, 45),
      city_bus: banded([[999, 2.5, 2.5]], 30, 14, 12),
    },
  },
}
const BY_COUNTRY: Record<string, FareTable> = { IN: INDIA, ID: INDONESIA }

/** Metro fares where a metro exists (Delhi, Mumbai, Japan, Paris), in the city's own currency. */
export const METRO: Record<string, { currency: string; fare: BandedFare }> = {
  delhi: { currency: 'INR', fare: banded([[2, 10, 10], [5, 20, 20], [12, 30, 30], [21, 40, 40], [32, 50, 50], [999, 60, 60]], 60, 33, 14) },
  mumbai: { currency: 'INR', fare: banded([[3, 10, 10], [12, 20, 30], [999, 40, 80]], 40, 32, 14) },
  japan: { currency: 'JPY', fare: banded([[6, 180, 180], [11, 220, 220], [19, 260, 260], [999, 300, 330]], 50, 35, 12) },
  paris: { currency: 'EUR', fare: banded([[999, 2.5, 2.5]], 50, 30, 12) },
}

export type FareScope = 'destination' | 'country' | 'generic'

/** The fare table for a place (a destination or transit-city id): its own, else its country's, else generic. */
export function fareTableFor(placeId: string | undefined): { table: FareTable; scope: FareScope } {
  const own = placeId ? BY_DESTINATION[placeId] : undefined
  if (own) return { table: own, scope: 'destination' }
  const country = transitCity(placeId)?.country
  const byCountry = country ? BY_COUNTRY[country] : undefined
  return byCountry ? { table: byCountry, scope: 'country' } : { table: GENERIC, scope: 'generic' }
}
