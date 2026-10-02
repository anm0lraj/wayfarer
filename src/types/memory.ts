import { z } from 'zod'
import { geoPointSchema, idSchema, isoDateTimeSchema, timestampsSchema } from './common'

export const memorySchema = z
  .object({
    id: idSchema,
    tripId: idSchema,
    authorId: idSchema,
    kind: z.enum(['photo', 'video', 'text', 'location', 'voice']),
    caption: z.string().optional(),
    mediaKey: z.string().optional(),
    text: z.string().optional(),
    capturedAt: isoDateTimeSchema,
    point: geoPointSchema.optional(),
    dayId: idSchema.optional(),
    itemId: idSchema.optional(),
    uploadState: z.enum(['queued', 'uploading', 'done', 'failed']),
    stripLocationOnPublic: z.boolean(),
  })
  .merge(timestampsSchema)
export type Memory = z.infer<typeof memorySchema>

export const storySlideSchema = z.object({
  id: idSchema,
  memoryId: idSchema.optional(),
  text: z.string().optional(),
  sticker: z.string().optional(),
  itemId: idSchema.optional(),
  location: z.string().optional(),
})
export const storySchema = z
  .object({
    id: idSchema,
    tripId: idSchema,
    authorId: idSchema,
    title: z.string(),
    dayId: idSchema.optional(),
    visibility: z.enum(['private', 'friends', 'public']),
    slides: z.array(storySlideSchema),
  })
  .merge(timestampsSchema)
export type Story = z.infer<typeof storySchema>
