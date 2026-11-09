import { api } from '@/lib/api'
import type { Flight, Hotel, TransitMode, TransitService } from '@/types'
import type { BookingService, FlightQuery, HotelQuery, TransitQuery } from './types'

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) continue
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v))
  }
  return sp.toString()
}

/** The sample timetable is bundled static data, loaded on the first train or bus search (not seeded into IndexedDB). */
async function searchTransit(mode: TransitMode, q: TransitQuery, signal?: AbortSignal): Promise<TransitService[]> {
  const { searchTransit: find } = await import('@/data/transit')
  signal?.throwIfAborted()
  return find(mode, q.from, q.to, q.date)
}

export const bookingService: BookingService = {
  searchHotels: (q: HotelQuery, signal) => api<Hotel[]>(`/api/hotels?${qs({ ...q })}`, { signal }),
  getHotel: (id, signal) => api<Hotel | undefined>(`/api/hotels/${encodeURIComponent(id)}`, { signal }).catch(() => undefined),
  searchFlights: (q: FlightQuery, signal) => api<Flight[]>(`/api/flights?${qs({ ...q })}`, { signal }),
  searchTrains: (q, signal) => searchTransit('train', q, signal),
  searchBuses: (q, signal) => searchTransit('bus', q, signal),
  /** Mock provider: nothing is ever booked. The result is explicitly a demo "saved to trip". */
  async createBooking() {
    return { mode: 'demo', status: 'saved', provider: 'Demo provider' }
  },
}
