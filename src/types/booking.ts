import { z } from 'zod'
import { geoPointSchema, idSchema, isoDateTimeSchema, moneySchema, timestampsSchema } from './common'

export const reviewSchema = z.object({ author: z.string(), rating: z.number().min(0).max(5), text: z.string(), date: z.string() })
export const roomTypeSchema = z.object({ id: idSchema, name: z.string(), sleeps: z.number().int(), pricePerNight: moneySchema })

export const hotelSchema = z
  .object({
    id: idSchema,
    destinationId: idSchema,
    name: z.string(),
    location: geoPointSchema,
    address: z.string(),
    images: z.array(z.string()),
    rating: z.number().min(0).max(5),
    reviewCount: z.number().int(),
    pricePerNight: moneySchema,
    propertyType: z.string(),
    amenities: z.array(z.string()),
    rooms: z.array(roomTypeSchema),
    distanceFromCenterKm: z.number(),
    reviews: z.array(reviewSchema),
  })
  .merge(timestampsSchema)
export type Hotel = z.infer<typeof hotelSchema>

export const airportRefSchema = z.object({ code: z.string().length(3), city: z.string(), name: z.string() })
export const flightSchema = z.object({
  id: idSchema,
  airline: z.string(),
  flightNumber: z.string(),
  from: airportRefSchema,
  to: airportRefSchema,
  departAt: isoDateTimeSchema,
  arriveAt: isoDateTimeSchema,
  durationMin: z.number().int(),
  stops: z.number().int().nonnegative(),
  price: moneySchema,
  cabin: z.enum(['economy', 'premium_economy', 'business']),
})
export type Flight = z.infer<typeof flightSchema>

export const bookingTypeSchema = z.enum(['flight', 'hotel', 'activity', 'transport'])
export const bookingStatusSchema = z.enum(['saved', 'pending', 'confirmed', 'cancelled'])
/** `demo` bookings are never real. Only a real provider adapter may emit `live`. */
export const bookingModeSchema = z.enum(['demo', 'live'])

export const bookingSchema = z
  .object({
    id: idSchema,
    tripId: idSchema,
    type: bookingTypeSchema,
    refId: idSchema.optional(),
    provider: z.string(),
    title: z.string(),
    price: moneySchema,
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema.optional(),
    confirmationNumber: z.string().optional(),
    status: bookingStatusSchema,
    mode: bookingModeSchema,
    details: z.record(z.unknown()).default({}),
  })
  .merge(timestampsSchema)
  .refine((b) => !(b.mode === 'demo' && b.status === 'confirmed'), {
    message: 'A demo booking can never be confirmed',
  })
export type Booking = z.infer<typeof bookingSchema>
