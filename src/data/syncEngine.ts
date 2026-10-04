import { db, type SyncOp } from './db'

export interface SyncResult { id: number; status: 'ok' | 'conflict'; /** The server's copy, when it is newer than ours. */ current?: { id: string; updatedAt?: string } & Record<string, unknown> }
export type SendBatch = (ops: SyncOp[]) => Promise<SyncResult[]>

export interface SyncSummary { sent: number; conflicts: number; failed: boolean; /** Why the last attempt failed, in words a person can pass on. */ error?: string }

const BATCH = 50
let running = false

/** POSTs a batch to the (mocked) backend proxy. Anything other than a clean answer is a failure and is retried later. */
export const sendBatchToApi: SendBatch = async (ops) => {
  const res = await fetch(new URL('/api/sync', globalThis.location?.origin ?? 'http://localhost'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops: ops.map(({ id, entity, entityId, op, payload, createdAt }) => ({ id, entity, entityId, op, payload, createdAt })) }),
  })
  if (!res.ok) throw new Error(`Sync failed (${res.status})`)
  return ((await res.json()) as { results: SyncResult[] }).results
}

/** Tables a sync entity can name. Anything else is dropped rather than written blindly. */
const table = (name: string) => (db.tables.find((t) => t.name === name) as { put(v: unknown): Promise<unknown> } | undefined)

/**
 * Conflict policy: **the newer write wins**, judged by `updatedAt`. If the server says it holds a newer copy
 * (another device edited the same thing while this one was offline), that copy replaces the local one and the
 * queued change is dropped. Anything else the queue says is applied as-is. The traveller is told how many of their
 * edits were replaced, so nothing changes silently.
 */
async function applyConflict(op: SyncOp, current: NonNullable<SyncResult['current']>) {
  const local = (await db.table(op.entity).get(op.entityId)) as { updatedAt?: string } | undefined
  if (!local?.updatedAt || !current.updatedAt || current.updatedAt >= local.updatedAt) await table(op.entity)?.put(current)
}

/**
 * The next changes to send, oldest first. A queued change that the browser cannot read back (it answers `undefined`;
 * seen in WebKit's private browsing, where a record can be stored yet unreadable) can never be sent, and left in place
 * it would stop every change behind it from ever syncing, so it is removed (by its key, which is still readable).
 */
export async function nextBatch(): Promise<{ ops: SyncOp[]; dropped: number }> {
  const ordered = db.syncQueue.orderBy('id')
  const [values, keys] = await Promise.all([ordered.clone().limit(BATCH).toArray(), ordered.clone().limit(BATCH).primaryKeys()])
  const unreadable = keys.filter((_, i) => !values[i])
  if (unreadable.length) {
    console.warn(`Dropped ${unreadable.length} unreadable queued change(s) so the rest can sync`)
    await db.syncQueue.bulkDelete(unreadable)
  }
  return { ops: values.filter((v): v is SyncOp => !!v), dropped: unreadable.length }
}

/** Sends the queue in order, in batches. Safe to call repeatedly; does nothing while offline or already running. */
export async function syncNow(send: SendBatch = sendBatchToApi): Promise<SyncSummary> {
  const summary: SyncSummary = { sent: 0, conflicts: 0, failed: false }
  if (running || (typeof navigator !== 'undefined' && !navigator.onLine)) return summary
  running = true
  try {
    for (;;) {
      const { ops, dropped } = await nextBatch()
      if (ops.length === 0) {
        if (dropped) continue // there may be readable changes behind the ones just removed
        break
      }
      let results: SyncResult[]
      try {
        results = await send(ops)
      } catch (err) {
        const code = (err as { code?: string }).code
        summary.error = err instanceof Error ? (code ? `${code}: ${err.message}` : err.message) : String(err)
        await Promise.all(ops.map((o) => db.syncQueue.update(o.id!, { attempts: o.attempts + 1 })))
        summary.failed = true
        break
      }
      const byId = new Map(results.map((r) => [r.id, r]))
      for (const op of ops) {
        const r = byId.get(op.id!)
        if (!r) { summary.failed = true; return summary } // not acknowledged: keep it, and everything after it, for next time
        if (r.status === 'conflict' && r.current) { await applyConflict(op, r.current); summary.conflicts++ }
        await db.syncQueue.delete(op.id!)
        summary.sent++
      }
    }
  } finally {
    running = false
  }
  return summary
}
