import { dayLoad } from '@/features/itinerary/schedule'
import { itemWindow } from '@/features/live-trip/liveStatus'
import { dateInTimezone, daysBetween, addDays } from '@/lib/dates'
import type { DayForecast } from '@/services/weather/types'
import type { Booking, ItineraryDay, ItineraryItem, NotificationType, TripState } from '@/types'

export interface NotificationCandidate {
  /** Stable per event, so the same reminder is only ever delivered once. */
  key: string
  type: NotificationType
  title: string
  body: string
  deepLink: string
}

export interface RuleContext {
  trip: { id: string; /** Destination name, e.g. "Bali". */ place: string; title: string; startDate: string; endDate: string; timezone: string; effectiveState: TripState }
  days: ItineraryDay[]
  items: ItineraryItem[]
  bookings: Booking[]
  now: Date
  /** Today's forecast at the destination, when known. */
  forecast?: DayForecast
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const FREE_TIME_MIN = 120
const SOON_MIN = 30

/**
 * Notifications that are useful right now for one trip — and no more. Pure: the caller decides what to do
 * with them (deduping by `key`, honouring per-type preferences, asking for push permission).
 */
export function buildNotifications({ trip, days, items, bookings, now, forecast }: RuleContext): NotificationCandidate[] {
  if (trip.effectiveState === 'completed' || trip.effectiveState === 'archived' || trip.effectiveState === 'draft') return []
  const out: NotificationCandidate[] = []
  const today = dateInTimezone(now, trip.timezone)
  const base = `/trips/${trip.id}`
  const untilStart = daysBetween(today, trip.startDate)

  if (untilStart === 7 || untilStart === 1) {
    out.push({
      key: `countdown:${trip.id}:${untilStart}`, type: 'trip_countdown', deepLink: untilStart === 7 ? `${base}/checklist` : base,
      title: untilStart === 7 ? `Your ${trip.place} trip starts in 7 days.` : `Your ${trip.place} trip starts tomorrow.`,
      body: untilStart === 7 ? 'Time to check your documents, bookings and packing.' : 'Last check: passport, bookings and charged phone.',
    })
  }

  for (const b of bookings) {
    if (b.type !== 'hotel' || b.status === 'cancelled') continue
    if (daysBetween(today, dateInTimezone(new Date(b.startAt), trip.timezone)) === 1) {
      out.push({ key: `checkin:${b.id}`, type: 'checkin_reminder', deepLink: `${base}/bookings`, title: 'Your hotel check-in is tomorrow.', body: `${b.title}. This is a saved plan — confirm with the property.` })
    }
  }

  const todayDay = days.find((d) => d.date === today)
  const tomorrowDay = days.find((d) => d.date === addDays(today, 1))
  for (const day of [todayDay, tomorrowDay]) {
    if (!day) continue
    const dayItems = items.filter((i) => i.dayId === day.id)
    if (dayLoad(dayItems).busy) {
      out.push({
        key: `busy:${day.id}`, type: 'busy_day', deepLink: `${base}/itinerary/day/${day.dayNumber}`,
        title: `Your Day ${day.dayNumber} itinerary may be too busy.`, body: `${plural(dayItems.length, 'stop')} planned. Want to trim it?`,
      })
    }
  }

  if (trip.effectiveState === 'active' && todayDay) {
    const live = items
      .filter((i) => i.dayId === todayDay.id)
      .map((item) => ({ item, ...itemWindow(item, todayDay.date, trip.timezone) }))
    const t = now.getTime()
    const open = live.filter((l) => l.item.status === 'upcoming' && l.end > t).sort((a, b) => a.start - b.start)
    const next = open.find((l) => l.start > t)
    const running = live.some((l) => l.item.status === 'in_progress' || (l.item.status === 'upcoming' && l.start <= t && t < l.end))

    if (next) {
      const minutes = Math.ceil((next.start - t) / 60_000)
      if (minutes <= SOON_MIN) {
        out.push({
          key: `next:${next.item.id}`, type: 'next_activity', deepLink: `${base}/live`,
          title: `Your next activity starts in ${plural(minutes, 'minute')}.`, body: next.item.title,
        })
      } else if (!running && minutes >= FREE_TIME_MIN) {
        out.push({
          key: `free:${trip.id}:${today}`, type: 'free_time', deepLink: `${base}/live`,
          title: `You have ${Math.floor(minutes / 60)} unplanned hours today.`, body: `Nothing until ${next.item.title}. Want ideas for what to do nearby?`,
        })
      }
    }

    if (forecast && (forecast.condition === 'rain' || forecast.condition === 'storm' || forecast.rainChancePct >= 70)) {
      out.push({
        key: `rain:${trip.id}:${today}`, type: 'weather_alert', deepLink: `${base}/live`,
        title: forecast.condition === 'storm' ? 'Thunderstorms expected today.' : 'Rain is likely today.', body: `${forecast.rainChancePct}% chance of rain. You might want to swap outdoor plans.`,
      })
    }
  }

  return out
}
