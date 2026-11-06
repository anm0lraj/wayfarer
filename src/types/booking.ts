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

/** A station or bus stand. Codes are short and local (NDLS, JP, UBG); the city id matches `data/transitCities`. */
export const transitStopSchema = z.object({ code: z.string().min(2).max(8), city: z.string(), name: z.string() })
export const transitModeSchema = z.enum(['train', 'bus'])
export type TransitMode = z.infer<typeof transitModeSchema>

/** One direct train or bus on one date, as a search result. Prices are per person, in INR like the rest of the trip. */
export const transitServiceSchema = z.object({
  id: idSchema,
  mode: transitModeSchema,
  operator: z.string(),
  number: z.string(),
  name: z.string(),
  from: transitStopSchema,
  to: transitStopSchema,
  /** Both carry their stop's own UTC offset, like flights, so the wall clock reads straight off the string. */
  departAt: isoDateTimeSchema,
  arriveAt: isoDateTimeSchema,
  durationMin: z.number().int().positive(),
  seatClass: z.string(),
  price: moneySchema,
  /** e.g. "Includes the Gilimanuk–Ketapang ferry". */
  note: z.string().optional(),
})
export type TransitService = z.infer<typeof transitServiceSchema>

/** What a saved train or bus keeps in `Booking.details`. */
export const transitDetailsSchema = z.object({
  serviceId: idSchema,
  operator: z.string(),
  number: z.string(),
  from: transitStopSchema,
  to: transitStopSchema,
  departAt: isoDateTimeSchema,
  arriveAt: isoDateTimeSchema,
  durationMin: z.number().int().positive(),
  seatClass: z.string(),
  pricePerPerson: moneySchema,
  travellers: z.number().int().positive(),
  note: z.string().optional(),
})
export type TransitDetails = z.infer<typeof transitDetailsSchema>

export const bookingTypeSchema = z.enum(['flight', 'hotel', 'activity', 'transport', 'train', 'bus'])
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
  .superRefine((b, ctx) => {
    // Trains and buses carry typed details; the other types keep their free-form ones.
    if (b.type !== 'train' && b.type !== 'bus') return
    const r = transitDetailsSchema.safeParse(b.details)
    if (!r.success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['details'], message: `Details don’t match a ${b.type} booking` })
  })
export type Booking = z.infer<typeof bookingSchema>
