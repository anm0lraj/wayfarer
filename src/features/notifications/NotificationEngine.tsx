import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDestination } from '@/data/queries/catalog'
import { useTripPlan } from '@/data/queries/plan'
import { useTrips, type TripWithState } from '@/data/queries/trips'
import { useForecast } from '@/data/queries/weather'
import { dateInTimezone } from '@/lib/dates'
import { useNow } from '@/lib/hooks/useNow'
import { useServices } from '@/services'
import { buildNotifications } from './rules'

/** Trips that can produce reminders. Finished, archived and empty drafts are skipped. */
const WATCHED = new Set(['planning', 'ready', 'upcoming', 'active'])

function TripNotifier({ trip }: { trip: TripWithState }) {
  const { notifications } = useServices()
  const qc = useQueryClient()
  const now = useNow()
  const plan = useTripPlan(trip.id)
  const destination = useDestination(trip.destinationIds[0]).data
  const today = dateInTimezone(now, trip.timezone)
  const forecast = useForecast(trip.effectiveState === 'active' ? destination?.location : undefined, today, today).data?.[0]
  const inFlight = useRef(new Set<string>())

  useEffect(() => {
    if (!plan.data || !destination) return
    const candidates = buildNotifications({ trip: { ...trip, place: destination.name }, days: plan.data.days, items: plan.data.items, bookings: plan.data.bookings, now, forecast })
    for (const c of candidates) {
      if (inFlight.current.has(c.key)) continue
      inFlight.current.add(c.key)
      void notifications
        .deliver({ type: c.type, tripId: trip.id, title: c.title, body: c.body, deepLink: c.deepLink, key: c.key, scheduledFor: now.toISOString() })
        .then((saved) => { if (saved) void qc.invalidateQueries({ queryKey: ['notifications'] }) })
        .catch(() => inFlight.current.delete(c.key))
    }
  }, [trip, plan.data, destination, now, forecast, notifications, qc])

  return null
}

/**
 * Turns the plan and the clock into in-app notifications (and a system notification only where the
 * traveller has allowed it). Mounted once in the app shell; renders nothing. Driven by the demo clock,
 * so the simulator shows the same reminders a real day would.
 */
export function NotificationEngine() {
  const { notifications } = useServices()
  const trips = useTrips().data?.filter((t) => WATCHED.has(t.effectiveState))
  // Already allowed on this device: make sure the server knows about it (a token can change; a new account can sign in).
  useEffect(() => {
    if (notifications.push.available && notifications.getPermission() === 'granted') void notifications.push.register().catch(() => false)
  }, [notifications])
  return <>{trips?.map((t) => <TripNotifier key={t.id} trip={t} />)}</>
}
