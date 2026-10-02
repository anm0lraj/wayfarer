import type { TripPlan } from '@/data/queries/plan'
import type { ItineraryItem } from '@/types'

/**
 * Pure updaters for the cached plan, applied optimistically before a repository write completes and rolled
 * back if it fails. They mirror what the repository does (positions are always 0..n-1 within a day).
 */
const sorted = (plan: TripPlan, items: ItineraryItem[]): TripPlan => {
  const order = new Map(plan.days.map((d) => [d.id, d.dayNumber]))
  return { ...plan, items: [...items].sort((a, b) => (order.get(a.dayId) ?? 0) - (order.get(b.dayId) ?? 0) || a.position - b.position) }
}

const renumber = (list: ItineraryItem[]) => list.map((item, i) => ({ ...item, position: i }))

export function optimisticReorder(plan: TripPlan, dayId: string, orderedIds: string[]): TripPlan {
  const inDay = plan.items.filter((i) => i.dayId === dayId)
  const byId = new Map(inDay.map((i) => [i.id, i]))
  const ordered = orderedIds.map((id) => byId.get(id)).filter((i): i is ItineraryItem => !!i)
  const rest = inDay.filter((i) => !orderedIds.includes(i.id))
  return sorted(plan, [...plan.items.filter((i) => i.dayId !== dayId), ...renumber([...ordered, ...rest])])
}

export function optimisticMove(plan: TripPlan, itemId: string, toDayId: string, toIndex = Number.MAX_SAFE_INTEGER): TripPlan {
  const item = plan.items.find((i) => i.id === itemId)
  if (!item) return plan
  const from = renumber(plan.items.filter((i) => i.dayId === item.dayId && i.id !== itemId))
  const target = plan.items.filter((i) => i.dayId === toDayId && i.id !== itemId)
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, { ...item, dayId: toDayId })
  const untouched = plan.items.filter((i) => i.dayId !== item.dayId && i.dayId !== toDayId)
  return sorted(plan, [...untouched, ...(item.dayId === toDayId ? [] : from), ...renumber(target)])
}

export function optimisticRemove(plan: TripPlan, itemId: string): TripPlan {
  const item = plan.items.find((i) => i.id === itemId)
  if (!item) return plan
  const rest = plan.items.filter((i) => i.dayId !== item.dayId)
  return sorted(plan, [...rest, ...renumber(plan.items.filter((i) => i.dayId === item.dayId && i.id !== itemId))])
}

export function optimisticUpdate(plan: TripPlan, itemId: string, patch: Partial<ItineraryItem>): TripPlan {
  return { ...plan, items: plan.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
}
