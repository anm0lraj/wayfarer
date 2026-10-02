import { dateInTimezone, daysBetween } from '@/lib/dates'
import type { StoredTripState, Trip, TripState } from '@/types'

/** A "ready" trip becomes "upcoming" this many days before departure. */
export const UPCOMING_WINDOW_DAYS = 14
/** The preparation checklist is surfaced this many days before departure. */
export const CHECKLIST_WINDOW_DAYS = 7

/** Manually/system-driven transitions between persisted states. */
const transitions: Record<StoredTripState, readonly StoredTripState[]> = {
  draft: ['planning', 'archived'],
  planning: ['ready', 'archived'],
  ready: ['planning', 'archived'],
  archived: ['planning'], // restore
}

export function canTransition(from: StoredTripState, to: StoredTripState): boolean {
  return transitions[from].includes(to)
}

/**
 * The state the UI should render. Persisted state plus the trip's own calendar:
 *   archived → archived · after end → completed · within dates → active ·
 *   ready and ≤14 days out → upcoming · otherwise the persisted state.
 * `now` comes from the clock service so the demo date simulator drives it.
 */
export function computeTripState(trip: Pick<Trip, 'state' | 'startDate' | 'endDate' | 'timezone'>, now: Date): TripState {
  if (trip.state === 'archived') return 'archived'
  const today = dateInTimezone(now, trip.timezone)
  if (today > trip.endDate) return 'completed'
  if (today >= trip.startDate) return 'active'
  if (trip.state === 'ready' && daysBetween(today, trip.startDate) <= UPCOMING_WINDOW_DAYS) return 'upcoming'
  return trip.state
}

/** Which day of the trip (1-based) it is in the trip's timezone, or null outside the trip. */
export function currentDayNumber(trip: Pick<Trip, 'startDate' | 'endDate' | 'timezone'>, now: Date): number | null {
  const today = dateInTimezone(now, trip.timezone)
  if (today < trip.startDate || today > trip.endDate) return null
  return daysBetween(trip.startDate, today) + 1
}

export const stateLabel: Record<TripState, string> = {
  draft: 'Draft',
  planning: 'Planning',
  ready: 'Ready',
  upcoming: 'Upcoming',
  active: 'Live now',
  completed: 'Completed',
  archived: 'Archived',
}
