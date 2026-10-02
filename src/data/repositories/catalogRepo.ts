import { db } from '../db'
import type { Destination, Flight, Hotel, Place, PlaceKind } from '@/types'

/** Read-only reference data (destinations, places, hotels, flights). Seeded locally; refreshed from the API later. */
export const catalogRepo = {
  listDestinations: (): Promise<Destination[]> => db.destinations.toArray(),
  getDestination: (id: string): Promise<Destination | undefined> => db.destinations.get(id),

  async listPlaces(destinationId: string, kind?: PlaceKind): Promise<Place[]> {
    const all = await db.places.where('destinationId').equals(destinationId).toArray()
    return kind ? all.filter((p) => p.kind === kind) : all
  },
  getPlace: (id: string): Promise<Place | undefined> => db.places.get(id),
  async getPlaces(ids: string[]): Promise<Place[]> {
    return (await db.places.bulkGet(ids)).filter((p): p is Place => !!p)
  },

  listHotels: (destinationId: string): Promise<Hotel[]> => db.hotels.where('destinationId').equals(destinationId).toArray(),
  getHotel: (id: string): Promise<Hotel | undefined> => db.hotels.get(id),
  listFlights: (): Promise<Flight[]> => db.flights.toArray(),
  getFlight: (id: string): Promise<Flight | undefined> => db.flights.get(id),
}
