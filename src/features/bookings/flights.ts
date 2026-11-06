import type { Trip } from '@/types'

export type FlightLeg = 'outbound' | 'return'

/** Home airport for the demo user; the trip's own airport by destination. Only Bali has demo flights. */
const HOME = 'BOM'
const DESTINATION_AIRPORT: Record<string, string> = { bali: 'DPS' }

/** Sensible first search: outbound arrives by day 1, return leaves on the last day. */
export function flightDefaults(trip: Pick<Trip, 'destinationIds' | 'startDate' | 'endDate'>, leg: FlightLeg) {
  const away = DESTINATION_AIRPORT[trip.destinationIds[0] ?? ''] ?? 'DPS'
  return leg === 'outbound' ? { from: HOME, to: away, date: trip.startDate } : { from: away, to: HOME, date: trip.endDate }
}

/** Wall-clock parts straight from the ISO string, which carries the stop's own offset (airport, station or bus stand) — so no timezone maths. */
export const wall = (iso: string) => ({ date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)), time: iso.slice(11, 16) })
export const duration = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
