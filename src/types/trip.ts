import { z } from 'zod'
import {
  budgetTierSchema, geoPointSchema, idSchema, interestSchema, isoDateSchema, isoDateTimeSchema, moneySchema,
  timeSchema, timestampsSchema, travelerGroupSchema, visibilitySchema,
} from './common'

/** States that are persisted. `upcoming`, `active`, `completed` are derived from dates (see features/trips/tripState). */
export const storedTripStateSchema = z.enum(['draft', 'planning', 'ready', 'archived'])
export type StoredTripState = z.infer<typeof storedTripStateSchema>
export const tripStateSchema = z.enum(['draft', 'planning', 'ready', 'upcoming', 'active', 'completed', 'archived'])
export type TripState = z.infer<typeof tripStateSchema>

export const tripSchema = z
  .object({
    id: idSchema,
    ownerId: idSchema,
    title: z.string().min(1),
    destinationIds: z.array(idSchema).min(1),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    timezone: z.string(),
    travellers: z.object({ group: travelerGroupSchema, count: z.number().int().positive() }),
    budget: z.object({ tier: budgetTierSchema, total: moneySchema.optional() }),
    interests: z.array(interestSchema),
    planningStyle: z.enum(['ai', 'manual', 'hybrid']),
    state: storedTripStateSchema,
    coverImage: z.string().optional(),
    visibility: visibilitySchema,
    publicTripId: idSchema.optional(),
    offlineAvailable: z.boolean(),
    archivedAt: isoDateTimeSchema.optional(),
    copiedFromPublicTripId: idSchema.optional(),
  })
  .merge(timestampsSchema)
export type Trip = z.infer<typeof tripSchema>

export const itineraryDaySchema = z.object({
  id: idSchema,
  tripId: idSchema,
  dayNumber: z.number().int().positive(),
  date: isoDateSchema,
  title: z.string().optional(),
  destinationId: idSchema.optional(),
  notes: z.string().optional(),
})
export type ItineraryDay = z.infer<typeof itineraryDaySchema>

export const itemCategorySchema = z.enum([
  'transport', 'lodging', 'food', 'sightseeing', 'activity', 'beach', 'shopping', 'sunset', 'free_time', 'other',
])
export type ItemCategory = z.infer<typeof itemCategorySchema>
export const itemStatusSchema = z.enum(['upcoming', 'on_the_way', 'in_progress', 'completed', 'skipped'])
export type ItemStatus = z.infer<typeof itemStatusSchema>

export const customLocationSchema = z.object({ name: z.string(), address: z.string().optional(), point: geoPointSchema })

export const itineraryItemSchema = z
  .object({
    id: idSchema,
    tripId: idSchema,
    dayId: idSchema,
    position: z.number(),
    startTime: timeSchema,
    durationMin: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().optional(),
    category: itemCategorySchema,
    placeId: idSchema.optional(),
    customLocation: customLocationSchema.optional(),
    estimatedCost: moneySchema.optional(),
    distanceFromPrevKm: z.number().nonnegative().optional(),
    travelTimeFromPrevMin: z.number().int().nonnegative().optional(),
    image: z.string().optional(),
    notes: z.string().optional(),
    bookingId: idSchema.optional(),
    status: itemStatusSchema,
    source: z.enum(['user', 'ai', 'template']),
  })
  .merge(timestampsSchema)
export type ItineraryItem = z.infer<typeof itineraryItemSchema>

export const checklistItemSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  label: z.string().min(1),
  type: z.enum(['auto', 'custom']),
  autoRule: z.enum(['flight_booked', 'hotel_booked', 'activities_booked']).optional(),
  done: z.boolean(),
  dueDate: isoDateSchema.optional(),
})
export type ChecklistItem = z.infer<typeof checklistItemSchema>

export const collaboratorRoleSchema = z.enum(['owner', 'editor', 'viewer'])
export type CollaboratorRole = z.infer<typeof collaboratorRoleSchema>

export const tripCollaboratorSchema = z.object({
  id: idSchema,
  tripId: idSchema,
  userId: idSchema,
  role: collaboratorRoleSchema,
  status: z.enum(['invited', 'accepted']),
  invitedBy: idSchema,
  invitedAt: isoDateTimeSchema,
})
export type TripCollaborator = z.infer<typeof tripCollaboratorSchema>
