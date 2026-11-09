import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { checklistRepo, itineraryRepo } from './repositories'
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

/** A change the server refuses (rules, permissions) must not hold up everything queued behind it. */
describe('a refused change', () => {
  /** Refuses every change to this activity, acknowledges the rest. */
  const refusing = (entityId: string): SendBatch => async (ops) => {
    const refusedKeys = new Set<string>()
    return ops.map((o) => {
      if (refusedKeys.has(o.entityId)) return { id: o.id!, status: 'held' as const }
      if (o.entityId !== entityId) return { id: o.id!, status: 'ok' as const }
      refusedKeys.add(o.entityId)
      return { id: o.id!, status: 'refused' as const }
    })
  }

  it('is parked with its refusal counted while the changes behind it are sent', async () => {
    await itineraryRepo.updateItem('item-d1-1', { notes: 'refused' })
    await itineraryRepo.updateItem('item-d1-2', { notes: 'fine' })
    await itineraryRepo.updateItem('item-d1-1', { notes: 'refused again' })
    await itineraryRepo.updateItem('item-d1-3', { notes: 'fine too' })
    const result = await syncNow(refusing('item-d1-1'))
    expect(result).toMatchObject({ sent: 2, refused: 1, failed: false })
    const left = await db.syncQueue.orderBy('id').toArray()
    expect(left.map((o) => [o.entityId, o.refusals ?? 0])).toEqual([['item-d1-1', 1], ['item-d1-1', 0]])
    // Next run: tried again first, and once it is accepted (or given up) the change behind it follows, in order.
    const send = vi.fn(ack)
    expect((await syncNow(send)).sent).toBe(2)
    expect(send.mock.calls[0]![0].map((o) => o.payload)).toMatchObject([{ notes: 'refused' }, { notes: 'refused again' }])
  })

  it('holds later changes to the same record in later batches too, and still reaches the end of the queue', async () => {
    await itineraryRepo.updateItem('item-d1-1', { notes: 'refused' })
    await makeEdits(60) // more of the same record, past the first batch
    await itineraryRepo.updateItem('item-d1-2', { notes: 'last' })
    const send = vi.fn(refusing('item-d1-1'))
    const result = await syncNow(send)
    expect(result).toMatchObject({ sent: 1, refused: 1 })
    expect(send.mock.calls.flatMap((c) => c[0]).filter((o) => o.entityId === 'item-d1-1')).toHaveLength(50) // one batch, then held
    expect(await db.syncQueue.count()).toBe(61)
  })
})

/** Checklist ticks and day titles had no `updatedAt`, so newer-wins could not tell copies apart and they never synced. */
describe('checklist ticks and day titles', () => {
  it('are queued with a timestamp', async () => {
    await checklistRepo.toggle('chk-bali-4')
    await itineraryRepo.updateDay('day-1', { title: 'Landing day' })
    const [tick, day] = (await db.syncQueue.orderBy('id').toArray()).map((o) => o.payload as { updatedAt?: string })
    expect(tick).toMatchObject({ id: 'chk-bali-4', done: true, updatedAt: expect.any(String) })
    expect(day).toMatchObject({ id: 'day-1', title: 'Landing day', updatedAt: expect.any(String) })
  })

  it('lose a conflict to a newer server copy, including a row stored before it had a timestamp', async () => {
    const old = (await db.checklist.get('chk-bali-5'))!
    expect(old.updatedAt).toBeUndefined() // seeded rows predate the field
    await checklistRepo.toggle('chk-bali-5')
    await db.checklist.put(old) // as if the local row were still the old, unstamped one
    const newer = { ...old, done: true, label: 'Visa sorted', updatedAt: '2099-01-01T00:00:00.000Z' }
    const result = await syncNow(async (ops) => ops.map((o) => ({ id: o.id!, status: 'conflict' as const, current: newer })))
    expect(result.conflicts).toBe(1)
    expect(await db.checklist.get('chk-bali-5')).toMatchObject({ done: true, label: 'Visa sorted' })
  })

  it('keep a local edit that is newer than the server’s copy', async () => {
    await itineraryRepo.updateDay('day-2', { title: 'Mine' })
    const older = { ...(await db.days.get('day-2'))!, title: 'Theirs', updatedAt: '2000-01-01T00:00:00.000Z' }
    await syncNow(async (ops) => ops.map((o) => ({ id: o.id!, status: 'conflict' as const, current: older })))
    expect((await db.days.get('day-2'))!.title).toBe('Mine')
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
        offset: (n: number) => wrap(c.offset(n)),
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
