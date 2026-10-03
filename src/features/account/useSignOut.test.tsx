import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { ServicesProvider } from '@/services'
import { settle } from '@/test/settle'

const mocks = vi.hoisted(() => ({
  syncNow: vi.fn(async () => ({ sent: 0, conflicts: 0, failed: false })),
  processUploads: vi.fn(async () => ({ uploaded: 0, failed: 0 })),
  signOut: vi.fn(async () => undefined),
}))

vi.mock('@/config/env', () => ({ env: { backend: 'firebase', isProduction: false, appEnv: 'development' } }))
vi.mock('@/data/remote', () => ({ sendBatch: vi.fn() }))
vi.mock('@/data/syncEngine', () => ({ syncNow: mocks.syncNow }))
vi.mock('@/data/uploadQueue', () => ({ processMemoryUploads: mocks.processUploads }))

import { useSignOut } from './useSignOut'

function Harness() {
  const { signOut, dialog } = useSignOut()
  return <><button onClick={() => void signOut()}>Sign out</button>{dialog}</>
}

function renderHarness() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ServicesProvider services={{ auth: { signOut: mocks.signOut } as never, storage: {} as never }}>
        <MemoryRouter><Harness /></MemoryRouter>
      </ServicesProvider>
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  await settle()
  await resetDemoData()
  await db.syncQueue.clear()
  await db.memories.toCollection().modify({ uploadState: 'done' })
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('signing out of a real account', () => {
  it('saves what is waiting first, then signs out with no questions when nothing is left', async () => {
    renderHarness()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
    expect(mocks.syncNow).toHaveBeenCalled()
    expect(mocks.processUploads).toHaveBeenCalled()
  })

  it('stops and says exactly what would be lost when something could not be saved', async () => {
    await db.syncQueue.add({ entity: 'items', entityId: 'i', op: 'put', createdAt: 1, attempts: 2 })
    const first = (await db.memories.toArray())[0]!
    await db.memories.put({ ...first, uploadState: 'failed' })
    renderHarness()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('Some of your work isn’t saved yet')).toBeInTheDocument()
    expect(screen.getByText(/1 change and 1 photo or recording/)).toBeInTheDocument()
    expect(mocks.signOut).not.toHaveBeenCalled()
  })

  it('“Stay signed in” keeps everything; “Sign out and lose them” goes ahead', async () => {
    await db.syncQueue.add({ entity: 'items', entityId: 'i', op: 'put', createdAt: 1, attempts: 2 })
    await db.syncQueue.add({ entity: 'items', entityId: 'j', op: 'put', createdAt: 2, attempts: 2 })
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await user.click(await screen.findByRole('button', { name: 'Stay signed in' }))
    expect(mocks.signOut).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await user.click(await screen.findByRole('button', { name: 'Sign out and lose them' }))
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
  })

  it('offline: does not try to sync, but still protects unsent work', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    await db.syncQueue.add({ entity: 'items', entityId: 'i', op: 'put', createdAt: 1, attempts: 0 })
    renderHarness()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText('Some of your work isn’t saved yet')).toBeInTheDocument()
    expect(mocks.syncNow).not.toHaveBeenCalled()
  })
})
