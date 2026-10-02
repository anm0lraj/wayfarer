import type { Booking } from '@/types'

const fmt = (iso: string, tz?: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(new Date(iso))

/** Flights keep the departure airport's own offset in their ISO string, so read the wall clock straight from it. */
const flightWhen = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return `${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)}, ${iso.slice(11, 16)}`
}

/** When a booking happens, as text: hotels show their stay, everything else the start time. */
export function bookingWhen(b: Booking, tz?: string): string {
  const d = b.details as { checkIn?: string; checkOut?: string; nights?: number }
  if (b.type === 'hotel' && d.checkIn && d.checkOut) {
    const day = (s: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${s}T00:00:00Z`))
    return `${day(d.checkIn)} – ${day(d.checkOut)}${d.nights ? ` · ${d.nights} night${d.nights === 1 ? '' : 's'}` : ''}`
  }
  return b.type === 'flight' ? flightWhen(b.startAt) : fmt(b.startAt, tz)
}
