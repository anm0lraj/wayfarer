import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { itineraryRepo } from './repositories'
import { resetDemoData } from './seed'
import { setActorId, DEMO_USER_ID } from './actor'
import { syncNow, type SendBatch } from './syncEngine'
import type { SyncOp } from './db'

const ack: SendBatch = async (ops) => ops.map((o) => ({ id: o.id!, status: 'ok' as const }))
const setOnline = (on: boolean) => Object.defineProperty(navigator, 'onLine', { value: on, configurable: true })

beforeEach(async () => {
  setOnline(true)
  await resetDemoData()
  setActorId(DEMO_USER_ID)
  await db.syncQueue.clear()
})

async function makeEdits(n: number) {
  for (let i = 0; i < n; i++) await itineraryRepo.updateItem('item-d1-1', { notes: `edit ${i}` })
}

describe('syncNow', () => {
  it('sends queued edits in order and empties the queue', async () => {
    await makeEdits(3)
    const send = vi.fn(ack)
    const result = await syncNow(send)
    expect(result).toEqual({ sent: 3, conflicts: 0, failed: false })
    expect(await db.syncQueue.count()).toBe(0)
    const ids = send.mock.calls[0]![0].map((o) => o.id!)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
  })

  it('does nothing while offline, and keeps every change', async () => {
    await makeEdits(2)
    setOnline(false)
    const send = vi.fn(ack)
    expect(await syncNow(send)).toEqual({ sent: 0, conflicts: 0, failed: false })
    expect(send).not.toHaveBeenCalled()
    expect(await db.syncQueue.count()).toBe(2)
  })

  it('keeps the queue and counts the attempt when the server is unreachable', async () => {
    await makeEdits(2)
    const result = await syncNow(async () => { throw new Error('network') })
    expect(result.failed).toBe(true)
    const left = await db.syncQueue.toArray()
    expect(left).toHaveLength(2)
    expect(left.every((o) => o.attempts === 1)).toBe(true)
    // …and a later attempt succeeds.
    expect((await syncNow(ack)).sent).toBe(2)
  })

  it('stops at the first change the server did not acknowledge, preserving order', async () => {
    await makeEdits(3)
    const [first] = await db.syncQueue.orderBy('id').toArray()
    const result = await syncNow(async () => [{ id: first!.id!, status: 'ok' as const }])
    expect(result).toMatchObject({ sent: 1, failed: true })
    expect(await db.syncQueue.count()).toBe(2)
  })

  it('lets a newer server copy win a conflict and reports it', async () => {
    await makeEdits(1)
    const local = (await db.items.get('item-d1-1'))!
    const newer = { ...local, title: 'Edited on another phone', updatedAt: '2099-01-01T00:00:00.000Z' }
    const result = await syncNow(async (ops) => ops.map((o) => ({ id: o.id!, status: 'conflict' as const, current: newer })))
    expect(result).toMatchObject({ sent: 1, conflicts: 1, failed: false })
    expect((await db.items.get('item-d1-1'))!.title).toBe('Edited on another phone')
    expect(await db.syncQueue.count()).toBe(0)
  })

  it('sends large queues in batches', async () => {
    await makeEdits(120)
    const send = vi.fn(ack)
    expect((await syncNow(send)).sent).toBe(120)
    expect(send.mock.calls.map((c) => c[0].length)).toEqual([50, 50, 20])
  })
})

/**
 * WebKit's private browsing can store a queued change that it then reads back as `undefined` (even though the count says it
 * is there). Reading must not choke on it: it can never be sent, and it must not block the changes behind it.
 */
describe('a queued change the browser cannot read back', () => {
  /** Makes the queue read return `undefined` in place of the entry with this key, like that browser does. */
  function unreadable(key: number) {
    const real = db.syncQueue.orderBy.bind(db.syncQueue)
    vi.spyOn(db.syncQueue, 'orderBy').mockImplementation(((index: string) => {
      const wrap = (c: ReturnType<typeof real>): unknown => ({
        clone: () => wrap(c.clone()),
        limit: (n: number) => wrap(c.limit(n)),
        toArray: async () => (await c.toArray()).map((o: SyncOp) => (o.id === key ? undefined : o)),
        primaryKeys: () => c.primaryKeys(),
      })
      return wrap(real(index))
    }) as never)
  }

  it('is dropped, and everything behind it still syncs', async () => {
    await makeEdits(3)
    const [first] = await db.syncQueue.orderBy('id').primaryKeys()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    unreadable(first as number)
    const send = vi.fn(ack)
    expect(await syncNow(send)).toEqual({ sent: 2, conflicts: 0, failed: false })
    expect(send.mock.calls.flatMap((c) => c[0]).map((o) => o.id)).not.toContain(first)
    expect(await db.syncQueue.count()).toBe(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unreadable'))
    vi.restoreAllMocks()
  })

  it('does not loop or fail when it is the only thing in the queue', async () => {
    await makeEdits(1)
    const [only] = await db.syncQueue.orderBy('id').primaryKeys()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    unreadable(only as number)
    const send = vi.fn(ack)
    expect(await syncNow(send)).toEqual({ sent: 0, conflicts: 0, failed: false })
    expect(send).not.toHaveBeenCalled()
    expect(await db.syncQueue.count()).toBe(0)
    vi.restoreAllMocks()
  })
})
