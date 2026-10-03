import { ITEM_CATEGORIES, aiAction, newDay, type AIAction, type CatalogPlace, type NewDay, type TripContextInput } from './schemas.js'

/**
 * The assistant proposes changes by calling these functions; it never writes anything. Each call is turned into one of
 * the app's typed actions, checked against the trip the app described (ids and days must exist), and only then sent
 * on. The app validates it again and applies nothing until the traveller confirms.
 */
type Json = Record<string, unknown>

const num = (description: string) => ({ type: 'number', description })
const str = (description: string) => ({ type: 'string', description })
const ids = (description: string) => ({ type: 'array', items: { type: 'string' }, description })

const itemProps = {
  title: str('Short name of the activity'),
  startTime: str('24-hour time, HH:MM'),
  durationMin: num('Length in minutes'),
  category: { type: 'string', enum: [...ITEM_CATEGORIES], description: 'Kind of activity' },
  placeId: str('id of a place from the list, if it is one of them'),
  description: str('One short sentence'),
  costInr: num('Estimated cost in Indian rupees, if known'),
}

const tool = (name: string, description: string, properties: Json, required: string[]) => ({
  type: 'function' as const,
  function: { name, description, parameters: { type: 'object', properties, required } },
})

export const CHAT_TOOLS = [
  tool('add_activity', 'Propose adding one activity to a day of the trip.', { dayNumber: num('Day of the trip, starting at 1'), ...itemProps }, ['dayNumber', 'title', 'startTime', 'durationMin', 'category']),
  tool('move_activity', 'Propose moving an existing activity to another day.', { itemId: str('id of the activity'), toDayNumber: num('Target day'), position: num('Position in that day, starting at 0') }, ['itemId', 'toDayNumber']),
  tool('remove_activity', 'Propose removing an existing activity. The traveller is asked to confirm.', { itemId: str('id of the activity') }, ['itemId']),
  tool('reorder_day', 'Propose a new order for the activities of one day.', { dayNumber: num('Day'), itemIds: ids('Every activity id of that day, in the new order') }, ['dayNumber', 'itemIds']),
  tool('optimize_route', 'Propose the shortest order to visit one day\'s stops.', { dayNumber: num('Day'), itemIds: ids('Every activity id of that day, in the proposed order') }, ['dayNumber', 'itemIds']),
  tool('suggest_places', 'Show places from the list as suggestions.', { placeIds: ids('ids from the places list') }, ['placeIds']),
  tool('find_restaurants', 'Show restaurants from the list as suggestions.', { placeIds: ids('ids of restaurants from the places list') }, ['placeIds']),
  tool('create_itinerary', 'Propose a full multi-day itinerary draft.', {
    days: { type: 'array', description: 'One entry per day, in order', items: { type: 'object', properties: { title: str('Day title'), items: { type: 'array', items: { type: 'object', properties: itemProps, required: ['title', 'startTime', 'durationMin', 'category'] } } }, required: ['items'] } },
  }, ['days']),
]

export const DAYS_TOOL = tool('propose_days', 'Return the proposed days.', {
  summary: str('One sentence describing the plan'),
  days: { type: 'array', items: { type: 'object', properties: { title: str('Day title'), items: { type: 'array', items: { type: 'object', properties: itemProps, required: ['title', 'startTime', 'durationMin', 'category'] } } }, required: ['items'] } },
}, ['summary', 'days'])

// ---- tool call -> typed action --------------------------------------------------------------------------------------

function item(a: Json) {
  const cost = typeof a.costInr === 'number' && a.costInr >= 0 ? { amount: Math.round(a.costInr), currency: 'INR' } : undefined
  return {
    title: a.title, startTime: a.startTime, durationMin: typeof a.durationMin === 'number' ? Math.round(a.durationMin) : a.durationMin,
    category: a.category, placeId: a.placeId || undefined, description: a.description || undefined, estimatedCost: cost,
  }
}

const days = (raw: unknown) => (Array.isArray(raw) ? raw.map((d: Json) => ({ title: d.title || undefined, items: Array.isArray(d.items) ? d.items.map((i: Json) => item(i)) : [] })) : raw)

/** The action a tool call describes, before any checking. */
export function rawAction(name: string, a: Json): unknown {
  switch (name) {
    case 'add_activity': return { type: 'ADD_ACTIVITY', dayNumber: a.dayNumber, item: item(a) }
    case 'move_activity': return { type: 'MOVE_ACTIVITY', itemId: a.itemId, toDayNumber: a.toDayNumber, position: a.position ?? 0 }
    case 'remove_activity': return { type: 'REMOVE_ACTIVITY', itemId: a.itemId }
    case 'reorder_day': return { type: 'REORDER_ITINERARY', dayNumber: a.dayNumber, itemIds: a.itemIds }
    case 'optimize_route': return { type: 'OPTIMIZE_ROUTE', dayNumber: a.dayNumber, itemIds: a.itemIds }
    case 'suggest_places': return { type: 'SUGGEST_PLACES', placeIds: a.placeIds }
    case 'find_restaurants': return { type: 'FIND_RESTAURANTS', placeIds: a.placeIds }
    case 'create_itinerary': return { type: 'CREATE_ITINERARY', days: days(a.days) }
    default: return undefined
  }
}

export interface Grounding {
  catalogue: CatalogPlace[]
  context?: TripContextInput
}

const knownPlaces = (g: Grounding) => new Set(g.catalogue.map((p) => p.id))
const knownItems = (g: Grounding) => new Set((g.context?.plan ?? []).flatMap((d) => d.items.map((i) => i.id)))

/** A place id the model made up is dropped from the item (the activity stays, just without a place). */
function groundItem<T extends { placeId?: string }>(it: T, places: Set<string>): T {
  return it.placeId && !places.has(it.placeId) ? { ...it, placeId: undefined } : it
}

/**
 * The action, if it is well-formed and refers only to things that exist: places from the list, activities and days
 * of this trip. Anything else is dropped, never repaired.
 */
export function groundedAction(name: string, args: Json, g: Grounding): AIAction | undefined {
  const parsed = aiAction.safeParse(rawAction(name, args))
  if (!parsed.success) return undefined
  const a = parsed.data
  const places = knownPlaces(g)
  const items = knownItems(g)
  const lastDay = g.context?.days ?? 14
  const dayOk = (n: number) => n >= 1 && n <= lastDay

  switch (a.type) {
    case 'ADD_ACTIVITY': return dayOk(a.dayNumber) ? { ...a, item: groundItem(a.item, places) } : undefined
    case 'MOVE_ACTIVITY': return items.has(a.itemId) && dayOk(a.toDayNumber) ? a : undefined
    case 'REMOVE_ACTIVITY': return items.has(a.itemId) ? a : undefined
    case 'REORDER_ITINERARY':
    case 'OPTIMIZE_ROUTE': {
      const day = g.context?.plan?.find((d) => d.dayNumber === a.dayNumber)
      const own = new Set(day?.items.map((i) => i.id))
      // Must be exactly that day's activities, each once.
      return day && a.itemIds.length === own.size && new Set(a.itemIds).size === a.itemIds.length && a.itemIds.every((i) => own.has(i)) ? a : undefined
    }
    case 'SUGGEST_PLACES':
    case 'FIND_RESTAURANTS': {
      const kept = a.placeIds.filter((p) => places.has(p))
      return kept.length ? { ...a, placeIds: kept } : undefined
    }
    case 'CREATE_ITINERARY': return a.days.length <= lastDay ? { ...a, days: a.days.map((d) => ({ ...d, items: d.items.map((i) => groundItem(i, places)) })) } : undefined
  }
}

/** Days returned by the itinerary endpoints: validated, with unknown place ids removed. */
export function groundedDays(raw: unknown, catalogue: CatalogPlace[], wanted: number): NewDay[] {
  const list = Array.isArray(raw) ? days(raw) : []
  const places = new Set(catalogue.map((p) => p.id))
  const out: NewDay[] = []
  for (const d of list as unknown[]) {
    const parsed = newDay.safeParse(d)
    if (parsed.success) out.push({ ...parsed.data, items: parsed.data.items.map((i) => groundItem(i, places)) })
  }
  return out.slice(0, wanted)
}
