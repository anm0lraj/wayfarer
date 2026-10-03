import { z } from 'zod'

/**
 * What the AI endpoints accept from the app and what they may return to it.
 *
 * The action and item schemas mirror `src/types/ai.ts` on purpose: Vercel runs this folder as plain ES modules, which
 * cannot import the app's extension-less source files, so the few schemas needed here are repeated. A unit test
 * (`src/server/ai.test.ts`) feeds the same samples to both versions and fails if they ever disagree.
 */
const id = z.string().min(1).max(100)
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const money = z.object({ amount: z.number().nonnegative(), currency: z.string().length(3) })
const point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

export const ITEM_CATEGORIES = ['transport', 'lodging', 'food', 'sightseeing', 'activity', 'beach', 'shopping', 'sunset', 'free_time', 'other'] as const

export const newItem = z.object({
  title: z.string().min(1).max(200),
  startTime: time,
  durationMin: z.number().int().positive().max(24 * 60),
  category: z.enum(ITEM_CATEGORIES),
  placeId: id.optional(),
  description: z.string().max(1000).optional(),
  estimatedCost: money.optional(),
  customLocation: z.object({ name: z.string().max(200), address: z.string().max(300).optional(), point }).optional(),
})
export type NewItem = z.infer<typeof newItem>

export const newDay = z.object({ title: z.string().max(200).optional(), items: z.array(newItem).max(12) })
export type NewDay = z.infer<typeof newDay>

export const aiAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ADD_ACTIVITY'), dayNumber: z.number().int().positive(), item: newItem }),
  z.object({ type: z.literal('MOVE_ACTIVITY'), itemId: id, toDayNumber: z.number().int().positive(), position: z.number().int().nonnegative() }),
  z.object({ type: z.literal('REMOVE_ACTIVITY'), itemId: id }),
  z.object({ type: z.literal('REORDER_ITINERARY'), dayNumber: z.number().int().positive(), itemIds: z.array(id) }),
  z.object({ type: z.literal('CREATE_ITINERARY'), days: z.array(newDay).min(1) }),
  z.object({ type: z.literal('SUGGEST_PLACES'), placeIds: z.array(id) }),
  z.object({ type: z.literal('FIND_RESTAURANTS'), placeIds: z.array(id) }),
  z.object({ type: z.literal('OPTIMIZE_ROUTE'), dayNumber: z.number().int().positive(), itemIds: z.array(id) }),
])
export type AIAction = z.infer<typeof aiAction>

// ---- requests from the app (untrusted: sizes are capped, shapes checked) ---------------------------------------------

/** A place the assistant may recommend. Only these ids can appear in what it proposes. */
export const catalogPlace = z.object({
  id, name: z.string().max(200), kind: z.string().max(30), tags: z.array(z.string().max(30)).max(12),
  rating: z.number().optional(), lat: z.number(), lng: z.number(), durationMin: z.number().optional(), costInr: z.number().optional(),
})
export type CatalogPlace = z.infer<typeof catalogPlace>

const planItem = z.object({ id, title: z.string().max(200), startTime: z.string().max(5), durationMin: z.number().optional() })
const planDay = z.object({ dayNumber: z.number().int().positive(), items: z.array(planItem).max(30) })

export const tripContext = z.object({
  trip: z.object({
    id, title: z.string().max(200), startDate: z.string().max(10), endDate: z.string().max(10),
    travellers: z.object({ group: z.string().max(20), count: z.number() }),
    budget: z.object({ tier: z.string().max(20).optional(), total: money.optional() }).passthrough(),
    interests: z.array(z.string().max(30)).max(20),
  }),
  destination: z.object({ id, name: z.string().max(100) }).optional(),
  hotelName: z.string().max(200).optional(),
  today: z.string().max(10),
  days: z.number().int().positive().max(60),
  currentDay: z.number().int().optional(),
  focusDay: z.number().int(),
  completed: z.array(z.string().max(200)).max(20),
  upcoming: z.array(z.string().max(200)).max(20),
  plan: z.array(planDay).max(60).optional(),
})
export type TripContextInput = z.infer<typeof tripContext>

export const chatBody = z.object({
  conversationId: z.string().max(100).optional(),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) })).min(1).max(30),
  context: tripContext.optional(),
  catalogue: z.array(catalogPlace).max(150).optional(),
})
export type ChatBody = z.infer<typeof chatBody>

export const itineraryBody = z.object({
  destinationId: id,
  destinationName: z.string().max(100).optional(),
  days: z.number().int().min(1).max(14),
  interests: z.array(z.string().max(30)).max(20),
  budgetTotal: z.number().nonnegative().optional(),
  prompt: z.string().max(500).optional(),
  catalogue: z.array(catalogPlace).max(150).optional(),
})
export type ItineraryBody = z.infer<typeof itineraryBody>

export const regenerateBody = itineraryBody.extend({ dayNumber: z.number().int().positive(), current: z.array(z.string().max(200)).max(30) })
export type RegenerateBody = z.infer<typeof regenerateBody>
