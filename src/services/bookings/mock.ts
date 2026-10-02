import { api } from '@/lib/api'
import type { Flight, Hotel } from '@/types'
import type { BookingService, FlightQuery, HotelQuery } from './types'

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v))
  }
  return sp.toString()
}

export const bookingService: BookingService = {
  searchHotels: (q: HotelQuery, signal) => api<Hotel[]>(`/api/hotels?${qs({ ...q })}`, { signal }),
  getHotel: (id, signal) => api<Hotel | undefined>(`/api/hotels/${encodeURIComponent(id)}`, { signal }).catch(() => undefined),
  searchFlights: (q: FlightQuery, signal) => api<Flight[]>(`/api/flights?${qs({ ...q })}`, { signal }),
  /** Mock provider: nothing is ever booked. The result is explicitly a demo "saved to trip". */
  async createBooking() {
    return { mode: 'demo', status: 'saved', provider: 'Demo provider' }
  },
}
