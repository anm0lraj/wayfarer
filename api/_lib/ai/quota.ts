import { firestoreBase } from '../firestore.js'
import { HttpError, type Caller } from './http.js'

/**
 * Each person gets a daily allowance of assistant "credits" (a chat message costs 1, a drafted itinerary 3). The count
 * is a Firestore document `users/{uid}/usage/{YYYY-MM-DD}` written with the person's own token. The security rules let
 * that number only go up (never down, never deleted), so it cannot be reset to get more; and the function always adds
 * to it, so it cannot be skipped by calling the function.
 *
 * The allowance is checked before the model is called and charged once the model has actually answered, so a provider
 * outage never costs the person a credit. (Two requests in flight at the same moment can slightly overshoot; that is
 * the price of not needing a server-side database.)
 */
export const DAILY_LIMIT = () => Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? 20))

/** The day, by the server's clock in India (so the allowance resets at midnight there), as YYYY-MM-DD. */
export const usageDay = (now = new Date()) => new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10)

/** `projects/x/databases/(default)/documents` from a REST base URL. */
const documentsRoot = (base: string) => base.replace(/^https?:\/\/[^/]+\/v1\//, '')

export interface Allowance { used: number; limit: number; day: string }

const authHeaders = (who: Caller) => ({ Authorization: `Bearer ${who.token}`, 'Content-Type': 'application/json' })
const usagePath = (who: Caller, day: string) => `users/${who.uid}/usage/${day}`

/** How much of today's allowance is used. Throws 429 if `cost` more would go over it. */
export async function checkCredits(who: Caller, cost: number, now = new Date()): Promise<Allowance> {
  const day = usageDay(now)
  const limit = DAILY_LIMIT()
  const read = await fetch(`${firestoreBase()}/${usagePath(who, day)}`, { headers: authHeaders(who) }).catch(() => undefined)
  if (!read) throw new HttpError(503, 'quota_unavailable')
  let used = 0
  if (read.ok) used = Number(((await read.json()) as { fields?: { count?: { integerValue?: string } } }).fields?.count?.integerValue ?? 0)
  else if (read.status !== 404) throw new HttpError(503, 'quota_unavailable') // fail closed: no count, no model call
  if (used + cost > limit) throw new HttpError(429, 'daily_limit', { used, limit, resetsAt: `${day}T24:00+05:30` })
  return { used, limit, day }
}

/** Adds `cost` to today's count (creating the day's record if needed). */
export async function chargeCredits(who: Caller, cost: number, now = new Date()): Promise<void> {
  const base = firestoreBase()
  const day = usageDay(now)
  const write = await fetch(`${base}:commit`, {
    method: 'POST', headers: authHeaders(who),
    body: JSON.stringify({
      writes: [{
        update: { name: `${documentsRoot(base)}/${usagePath(who, day)}`, fields: {} },
        // An empty mask: leave existing fields alone, so the increment adds to the stored count instead of to nothing.
        updateMask: { fieldPaths: [] },
        updateTransforms: [{ fieldPath: 'count', increment: { integerValue: String(cost) } }],
      }],
    }),
  }).catch(() => undefined)
  if (!write?.ok) throw new HttpError(503, 'quota_unavailable')
}
