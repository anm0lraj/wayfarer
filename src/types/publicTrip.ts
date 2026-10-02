import { z } from 'zod'
import { idSchema, isoDateTimeSchema, moneySchema } from './common'
import { itineraryDaySchema, itineraryItemSchema } from './trip'
import { placeSchema } from './place'

/** Sanitised copy of a trip: no private notes, bookings, confirmation numbers or exact memory locations. */
export const sanitizedTripSnapshotSchema = z.object({
  days: z.array(itineraryDaySchema),
  items: z.array(itineraryItemSchema.omit({ notes: true, bookingId: true })),
  places: z.array(placeSchema),
  memories: z.array(
    z.object({ id: idSchema, caption: z.string().optional(), mediaUrl: z.string(), dayNumber: z.number().int().optional() }),
  ),
})
export type SanitizedTripSnapshot = z.infer<typeof sanitizedTripSnapshotSchema>

export const publicTripSchema = z.object({
  id: idSchema,
  slug: z.string(),
  tripId: idSchema.optional(), // absent for seeded trips from other travellers
  ownerId: idSchema,
  ownerName: z.string(),
  title: z.string(),
  description: z.string(),
  coverImage: z.string(),
  destinationIds: z.array(idSchema),
  durationDays: z.number().int(),
  budgetRange: z.tuple([moneySchema, moneySchema]),
  travelStyle: z.string(),
  tips: z.array(z.string()),
  snapshot: sanitizedTripSnapshotSchema,
  likeCount: z.number().int(),
  saveCount: z.number().int(),
  publishedAt: isoDateTimeSchema,
})
export type PublicTrip = z.infer<typeof publicTripSchema>

export const savedTripSchema = z
  .object({ id: idSchema, userId: idSchema, publicTripId: idSchema.optional(), tripId: idSchema.optional(), savedAt: isoDateTimeSchema })
  .refine((s) => !!s.publicTripId || !!s.tripId, { message: 'Needs publicTripId or tripId' })
export type SavedTrip = z.infer<typeof savedTripSchema>
