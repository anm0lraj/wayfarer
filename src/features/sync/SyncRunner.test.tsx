import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { serialRun } from './serialRun'
import { useSyncState } from './useSyncStatus'

const mocks = vi.hoisted(() => ({
  syncNow: vi.fn(async () => ({ sent: 0, conflicts: 0, failed: false })),
  pullRemote: vi.fn(async () => 0),
}))
vi.mock('@/data/remote', () => ({ sendBatch: vi.fn(), pullRemote: mocks.pullRemote }))
vi.mock('@/data/syncEngine', () => ({ syncNow: mocks.syncNow }))
vi.mock('@/app/providers/session', () => ({ useSession: () => ({ user: { id: 'u1' } }) }))
vi.mock('./useSyncStatus', async (real) => ({ ...(await real<typeof import('./useSyncStatus')>()), usePendingChanges: () => 0 }))

import { SyncRunner } from './SyncRunner'

/** A promise and the function that settles it, for holding a pass open. */
function gate() {
  let open!: () => void
  const promise = new Promise<void>((r) => { open = r })
  return { promise, open }
}

beforeEach(() => {
  useSyncState.setState({ syncing: false, lastFailed: false, lastError: undefined })
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('serialRun', () => {
  it('clears "syncing" when a pass throws, and reports the failure', async () => {
    const run = serialRun(async () => { throw new Error('database closed') })
    await run()
    expect(useSyncState.getState()).toMatchObject({ syncing: false, lastFailed: true, lastError: 'database closed' })
  })

  it('never overlaps passes: a call during a pass asks for one more pass after it', async () => {
    const g = gate()
    let active = 0
    let most = 0
    const pass = vi.fn(async () => {
      active++
      most = Math.max(most, active)
      if (pass.mock.calls.length === 1) await g.promise
      active--
    })
    const run = serialRun(pass)
    const first = run()
    expect(useSyncState.getState().syncing).toBe(true)
    void run()
    void run()
    g.open()
    await first
    expect(pass).toHaveBeenCalledTimes(2) // the two calls made mid-pass became one follow-up pass
    expect(most).toBe(1)
    expect(useSyncState.getState().syncing).toBe(false)
  })
})

describe('SyncRunner', () => {
  const tree = () => <QueryClientProvider client={new QueryClient()}><SyncRunner /></QueryClientProvider>

  it('does not stay stuck on "syncing" when the sync engine rejects', async () => {
    mocks.syncNow.mockRejectedValueOnce(new Error('boom'))
    render(tree())
    await waitFor(() => expect(mocks.syncNow).toHaveBeenCalled())
    await waitFor(() => expect(useSyncState.getState()).toMatchObject({ syncing: false, lastFailed: true, lastError: 'boom' }))
  })

  it('does not start a second sync while one is still running', async () => {
    const g = gate()
    mocks.syncNow.mockImplementationOnce(async () => { await g.promise; return { sent: 0, conflicts: 0, failed: false } })
    render(tree())
    await waitFor(() => expect(mocks.syncNow).toHaveBeenCalledTimes(1))
    // Coming back online re-runs the effect, which asks for another sync while the first is still out.
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    await act(async () => { window.dispatchEvent(new Event('offline')) })
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    await act(async () => { window.dispatchEvent(new Event('online')) })
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(mocks.syncNow).toHaveBeenCalledTimes(1)
    expect(useSyncState.getState().syncing).toBe(true)
    await act(async () => { g.open() })
    await waitFor(() => expect(useSyncState.getState().syncing).toBe(false))
    expect(mocks.syncNow).toHaveBeenCalledTimes(2) // the request made meanwhile ran once, after the first
  })
})
