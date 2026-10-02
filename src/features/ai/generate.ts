import { newDayInputSchema, type Destination, type Interest, type NewDayInput } from '@/types'
import { splitDays } from '@/features/trips/create/helpers'
import type { AIService } from '@/services/ai/types'

export interface GeneratedDays {
  days: NewDayInput[]
  /** Destination id for each generated day (same length as `days`), for multi-city trips. */
  dayDestinations: string[]
}

/**
 * Asks the assistant for a draft itinerary, one request per destination with the trip's days split between
 * them. The response is untrusted input: every day is validated before it is returned.
 */
export async function generateDays(
  ai: AIService,
  destinations: Destination[],
  opts: { totalDays: number; interests: Interest[]; budgetTotal?: number; prompt?: string },
  signal?: AbortSignal,
): Promise<GeneratedDays> {
  const lengths = splitDays(opts.totalDays, destinations.length)
  const days: NewDayInput[] = []
  const dayDestinations: string[] = []
  for (const [i, d] of destinations.entries()) {
    const preview = await ai.generateItinerary({ destinationId: d.id, days: lengths[i]!, interests: opts.interests, budgetTotal: opts.budgetTotal, prompt: opts.prompt }, signal)
    for (const day of preview.days) {
      days.push(newDayInputSchema.parse(day))
      dayDestinations.push(d.id)
    }
  }
  return { days, dayDestinations }
}
