import { z } from 'zod'
import { destinationCategorySchema, geoPointSchema, idSchema, moneySchema, timestampsSchema } from './common'

export const destinationSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    country: z.string(),
    region: z.string().optional(),
    location: geoPointSchema,
    timezone: z.string(),
    currency: z.string().length(3),
    heroImage: z.string(),
    overview: z.string(),
    bestTimeToVisit: z.string(),
    estimatedDailyBudget: moneySchema,
    tags: z.array(destinationCategorySchema),
    travelTips: z.array(z.string()),
  })
  .merge(timestampsSchema)
export type Destination = z.infer<typeof destinationSchema>
