import { db, type SyncOp } from './db'

export async function enqueue(entity: string, entityId: string, op: SyncOp['op'], payload?: unknown) {
  await db.syncQueue.add({ entity, entityId, op, payload, createdAt: Date.now(), attempts: 0 })
}

export function pendingCount() {
  return db.syncQueue.count()
}

/**
 * Replays queued writes against the (mock) remote API in order. Stops at the first failure so
 * ordering is preserved; retried when connectivity returns. Conflict handling is added in Phase 8.
 */
export async function flush(send: (op: SyncOp) => Promise<void>): Promise<{ sent: number; failed: boolean }> {
  let sent = 0
  for (const op of await db.syncQueue.orderBy('id').toArray()) {
    try {
      await send(op)
      await db.syncQueue.delete(op.id!)
      sent++
    } catch {
      await db.syncQueue.update(op.id!, { attempts: op.attempts + 1 })
      return { sent, failed: true }
    }
  }
  return { sent, failed: false }
}
