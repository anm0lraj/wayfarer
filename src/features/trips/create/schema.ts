import { z } from 'zod'
import { budgetTierSchema, interestSchema, travelerGroupSchema } from '@/types'
import { daysBetween, tripLengthDays } from '@/lib/dates'

export const MAX_TRIP_DAYS = 30
export const MAX_TRAVELLERS = 20

export const STEPS = [
  { slug: 'destination', label: 'Destination', fields: ['destinationIds'] },
  { slug: 'dates', label: 'Dates', fields: ['start', 'end'] },
  { slug: 'travellers', label: 'Travellers', fields: ['group', 'count'] },
  { slug: 'budget', label: 'Budget', fields: ['tier', 'customBudget'] },
  { slug: 'interests', label: 'Interests', fields: ['interests'] },
  { slug: 'style', label: 'Planning style', fields: ['style'] },
] as const satisfies ReadonlyArray<{ slug: string; label: string; fields: ReadonlyArray<keyof TripDraft> }>

const dateString = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message)

/** `today` is injected (clock service) so the demo date simulator and tests control "not in the past". */
export const makeDraftSchema = (today: string) =>
  z
    .object({
      destinationIds: z.array(z.string()).min(1, 'Choose at least one destination').max(6, 'Up to 6 destinations'),
      start: dateString('Pick a start date'),
      end: dateString('Pick an end date'),
      group: travelerGroupSchema,
      count: z.number({ invalid_type_error: 'Enter a number' }).int().min(1, 'At least 1 traveller').max(MAX_TRAVELLERS, `Up to ${MAX_TRAVELLERS} travellers`),
      tier: budgetTierSchema,
      customBudget: z.string().refine((v) => v.trim() === '' || (Number(v) > 0 && Number.isFinite(Number(v))), 'Enter an amount greater than 0'),
      interests: z.array(interestSchema),
      style: z.enum(['ai', 'manual', 'hybrid']),
    })
    .superRefine((d, ctx) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d.start) && d.start < today) ctx.addIssue({ code: 'custom', path: ['start'], message: 'Start date can’t be in the past' })
      if (/^\d{4}-\d{2}-\d{2}$/.test(d.start) && /^\d{4}-\d{2}-\d{2}$/.test(d.end)) {
        if (d.end < d.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'End date must be on or after the start date' })
        else if (tripLengthDays(d.start, d.end) > MAX_TRIP_DAYS) ctx.addIssue({ code: 'custom', path: ['end'], message: `Trips can be up to ${MAX_TRIP_DAYS} days` })
      }
    })

export type TripDraft = z.infer<ReturnType<typeof makeDraftSchema>>

export const DEFAULT_DRAFT: TripDraft = {
  destinationIds: [], start: '', end: '', group: 'couple', count: 2, tier: 'comfort', customBudget: '', interests: [], style: 'hybrid',
}

/** Typical group sizes; solo and couple are fixed, the rest are editable. */
export const GROUP_DEFAULT_COUNT: Record<TripDraft['group'], number> = { solo: 1, couple: 2, friends: 4, family: 4, custom: 3 }

const TIER_MULTIPLIER: Record<TripDraft['tier'], number> = { economy: 0.7, comfort: 1, premium: 1.6, luxury: 2.5 }

/** Rough all-in budget suggestion: destination daily average × travellers × days × tier. Rounded to the nearest ₹1,000. */
export function suggestBudget(dailyPerPerson: number, travellers: number, start: string, end: string, tier: TripDraft['tier']): number | null {
  if (!start || !end || daysBetween(start, end) < 0) return null
  return Math.round((dailyPerPerson * travellers * tripLengthDays(start, end) * TIER_MULTIPLIER[tier]) / 1000) * 1000
}
