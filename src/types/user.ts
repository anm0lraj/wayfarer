import { z } from 'zod'
import {
  accommodationTypeSchema, budgetTierSchema, idSchema, interestSchema, timestampsSchema, travelerGroupSchema,
} from './common'
import { notificationTypeSchema } from './notification'

export const userPreferencesSchema = z.object({
  travelStyle: z.string().optional(),
  budgetRange: budgetTierSchema.optional(),
  interests: z.array(interestSchema).default([]),
  preferredDestinations: z.array(z.string()).default([]),
  typicalDurationDays: z.number().int().positive().optional(),
  accommodation: accommodationTypeSchema.optional(),
  companions: travelerGroupSchema.optional(),
})

export const userSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    email: z.string().email().optional(),
    avatarUrl: z.string().optional(),
    bio: z.string().optional(),
    homeLocation: z.string().optional(),
    preferences: userPreferencesSchema,
    settings: z.object({
      theme: z.enum(['system', 'light', 'dark']),
      notificationPrefs: z.record(notificationTypeSchema, z.boolean()),
    }),
    onboardingCompleted: z.boolean(),
  })
  .merge(timestampsSchema)
export type User = z.infer<typeof userSchema>
