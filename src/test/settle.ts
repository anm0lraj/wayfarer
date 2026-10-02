import { db } from '@/data/db'

/**
 * Resolves once local writes have stopped. Repository operations are several awaited steps (write, reorder,
 * recompute travel legs), so a test can finish its assertions while the last steps are still running; a reset
 * in the next test's `beforeEach` would then race them and leave stray rows. Every write adds a sync-queue entry
 * (or an update to a table), so "the sync queue stopped growing and the item table stopped changing" is a good proxy.
 */
export async function settle(quietMs = 150): Promise<void> {
  const snapshot = async () => `${await db.syncQueue.count()}:${(await db.items.toArray()).map((i) => i.updatedAt + (i.travelTimeFromPrevMin ?? '')).join('|')}`
  let last = await snapshot()
  for (let stable = 0; stable < 2; ) {
    await new Promise((r) => setTimeout(r, quietMs))
    const now = await snapshot()
    stable = now === last ? stable + 1 : 0
    last = now
  }
}
