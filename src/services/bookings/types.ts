import type { Flight, Hotel, Money } from '@/types'

export interface HotelQuery {
  destinationId: string
  checkIn?: string
  checkOut?: string
  guests?: number
  minPrice?: number
  maxPrice?: number
  minRating?: number
  maxDistanceKm?: number
  amenities?: string[]
  propertyTypes?: string[]
  sort?: 'recommended' | 'price' | 'rating' | 'distance'
}

export interface FlightQuery {
  from: string
  to: string
  date: string
  travellers?: number
}

export interface BookingRequest {
  tripId: string
  type: 'flight' | 'hotel' | 'activity' | 'transport'
  refId: string
  title: string
  price: Money
  startAt: string
  endAt?: string
}

/**
 * Outcome from a booking provider. The mock can only ever produce `demo`/`saved`. A real provider
 * adapter would additionally return `live` with a confirmed status and a confirmation number.
 */
export type BookingResult =
  | { mode: 'demo'; status: 'saved'; provider: string }
  | { mode: 'live'; status: 'pending' | 'confirmed'; provider: string; confirmationNumber: string }

export interface BookingService {
  searchHotels(q: HotelQuery, signal?: AbortSignal): Promise<Hotel[]>
  getHotel(id: string, signal?: AbortSignal): Promise<Hotel | undefined>
  searchFlights(q: FlightQuery, signal?: AbortSignal): Promise<Flight[]>
  createBooking(req: BookingRequest): Promise<BookingResult>
}
