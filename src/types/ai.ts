import { z } from 'zod'
import { idSchema, isoDateTimeSchema } from './common'
import { itineraryItemSchema } from './trip'

export const newItemInputSchema = itineraryItemSchema.pick({
  title: true,
  startTime: true,
  durationMin: true,
  category: true,
  placeId: true,
  description: true,
  estimatedCost: true,
  customLocation: true,
})
export type NewItemInput = z.infer<typeof newItemInputSchema>

export const newDayInputSchema = z.object({ title: z.string().optional(), items: z.array(newItemInputSchema) })
export type NewDayInput = z.infer<typeof newDayInputSchema>

/** Every AI-proposed change. The model never writes data; actions are validated then applied via repositories. */
export const aiActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ADD_ACTIVITY'), dayNumber: z.number().int().positive(), item: newItemInputSchema }),
  z.object({
    type: z.literal('MOVE_ACTIVITY'),
    itemId: idSchema,
    toDayNumber: z.number().int().positive(),
    position: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal('REMOVE_ACTIVITY'), itemId: idSchema }),
  z.object({ type: z.literal('REORDER_ITINERARY'), dayNumber: z.number().int().positive(), itemIds: z.array(idSchema) }),
  z.object({ type: z.literal('CREATE_ITINERARY'), days: z.array(newDayInputSchema).min(1) }),
  z.object({ type: z.literal('SUGGEST_PLACES'), placeIds: z.array(idSchema) }),
  z.object({ type: z.literal('FIND_RESTAURANTS'), placeIds: z.array(idSchema) }),
  z.object({ type: z.literal('OPTIMIZE_ROUTE'), dayNumber: z.number().int().positive(), itemIds: z.array(idSchema) }),
])
export type AIAction = z.infer<typeof aiActionSchema>

export const aiActionStateSchema = z.enum(['pending', 'applied', 'dismissed', 'undone'])

export const aiConversationSchema = z.object({
  id: idSchema,
  userId: idSchema,
  tripId: idSchema.optional(),
  title: z.string(),
  createdAt: isoDateTimeSchema,
})
export type AIConversation = z.infer<typeof aiConversationSchema>

export const aiMessageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  actions: z.array(aiActionSchema).optional(),
  actionStates: z.record(aiActionStateSchema).optional(),
  createdAt: isoDateTimeSchema,
})
export type AIMessage = z.infer<typeof aiMessageSchema>
