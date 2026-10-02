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
