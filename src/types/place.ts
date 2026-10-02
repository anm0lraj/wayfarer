import { z } from 'zod'
import { dietaryTagSchema, geoPointSchema, idSchema, moneySchema, timestampsSchema } from './common'

export const placeKindSchema = z.enum([
  'attraction', 'activity', 'viewpoint', 'transport', 'airport', 'shop', 'hidden_gem', 'restaurant',
])
export type PlaceKind = z.infer<typeof placeKindSchema>

const placeBaseSchema = z
  .object({
    id: idSchema,
    kind: placeKindSchema,
    destinationId: idSchema,
    name: z.string(),
    description: z.string(),
    location: geoPointSchema,
    address: z.string().optional(),
    images: z.array(z.string()),
    rating: z.number().min(0).max(5).optional(),
    priceLevel: z.number().int().min(1).max(4).optional(),
    openingHours: z.string().optional(),
    tags: z.array(z.string()),
    typicalDurationMin: z.number().int().positive().optional(),
    costEstimate: moneySchema.optional(),
  })
  .merge(timestampsSchema)

export const restaurantSchema = placeBaseSchema.extend({
  kind: z.literal('restaurant'),
  cuisines: z.array(z.string()),
  dietary: z.array(dietaryTagSchema),
  priceLevel: z.number().int().min(1).max(4),
})
export type Restaurant = z.infer<typeof restaurantSchema>

export const nonRestaurantKindSchema = placeKindSchema.exclude(['restaurant'])
export const placeSchema = z.union([restaurantSchema, placeBaseSchema.extend({ kind: nonRestaurantKindSchema })])
export type Place = z.infer<typeof placeSchema>
