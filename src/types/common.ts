import { z } from 'zod'

export const idSchema = z.string().min(1)
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
export const isoDateTimeSchema = z.string().datetime({ offset: true })
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')

export const moneySchema = z.object({ amount: z.number().nonnegative(), currency: z.string().length(3) })
export type Money = z.infer<typeof moneySchema>

export const geoPointSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
export type GeoPoint = z.infer<typeof geoPointSchema>

export const timestampsSchema = z.object({ createdAt: isoDateTimeSchema, updatedAt: isoDateTimeSchema })

export const budgetTierSchema = z.enum(['economy', 'comfort', 'premium', 'luxury'])
export type BudgetTier = z.infer<typeof budgetTierSchema>

export const interestSchema = z.enum([
  'nature', 'food', 'adventure', 'history', 'beaches', 'mountains', 'nightlife', 'photography', 'shopping', 'culture',
])
export type Interest = z.infer<typeof interestSchema>

export const travelerGroupSchema = z.enum(['solo', 'couple', 'friends', 'family', 'custom'])
export type TravelerGroup = z.infer<typeof travelerGroupSchema>

export const accommodationTypeSchema = z.enum(['hotel', 'resort', 'hostel', 'apartment', 'villa', 'homestay'])
export type AccommodationType = z.infer<typeof accommodationTypeSchema>

export const dietaryTagSchema = z.enum(['vegetarian', 'vegan', 'halal', 'gluten_free', 'jain'])
export type DietaryTag = z.infer<typeof dietaryTagSchema>

export const destinationCategorySchema = z.enum([
  'trending', 'weekend', 'beaches', 'mountains', 'food', 'adventure', 'international', 'budget',
])
export type DestinationCategory = z.infer<typeof destinationCategorySchema>

export const visibilitySchema = z.enum(['private', 'link', 'public'])
export type Visibility = z.infer<typeof visibilitySchema>

export const DEFAULT_CURRENCY = 'INR'
