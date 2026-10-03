import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import { resetDemoData } from '@/data/seed'
import { memoryRepo } from '@/data/repositories'
import { ServicesProvider } from '@/services'
import { useToastStore } from '@/components/feedback/toast'
import { storageService } from '@/services/storage/mock'
import { settle } from '@/test/settle'
import { UNDO_WINDOW_MS, useMemoryActions } from './memories'

const remove = vi.fn(async () => undefined)

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ServicesProvider services={{ storage: { ...storageService, remove } }}>{children}</ServicesProvider>
    </QueryClientProvider>
  )
  return renderHook(() => useMemoryActions('trip-bali'), { wrapper })
}

async function aPhotoMemory() {
  return memoryRepo.add({ tripId: 'trip-bali', kind: 'photo', caption: 'Sunset', mediaKey: 'trips/trip-bali/memories/abc', capturedAt: '2026-10-13T10:00:00.000Z', uploadState: 'done', stripLocationOnPublic: true })
}

beforeEach(async () => {
  await settle()
  setActorId(DEMO_USER_ID)
  await resetDemoData()
  remove.mockClear()
})
afterEach(() => { vi.useRealTimers() })

describe('deleting a memory', () => {
  it('removes its stored photo once the Undo window has passed', async () => {
    const m = await aPhotoMemory()
    const { result } = setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await act(async () => { await result.current.remove(m) })

    expect(remove).not.toHaveBeenCalled() // still undoable
    await act(async () => { vi.advanceTimersByTime(UNDO_WINDOW_MS - 1) })
    expect(remove).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(2) })
    expect(remove).toHaveBeenCalledWith('trips/trip-bali/memories/abc')
  })

  it('keeps the photo when the deletion is undone', async () => {
    const m = await aPhotoMemory()
    const { result } = setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await act(async () => { await result.current.remove(m) })

    const undo = useToastStore.getState().items.at(-1)!.action!
    await act(async () => { undo.onClick() })
    await act(async () => { vi.advanceTimersByTime(UNDO_WINDOW_MS * 2) })
    expect(remove).not.toHaveBeenCalled()
  })

  it('has nothing to clean up for a note', async () => {
    const m = await memoryRepo.add({ tripId: 'trip-bali', kind: 'text', text: 'A note', capturedAt: '2026-10-13T10:00:00.000Z', uploadState: 'done', stripLocationOnPublic: true })
    const { result } = setup()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await act(async () => { await result.current.remove(m) })
    await act(async () => { vi.advanceTimersByTime(UNDO_WINDOW_MS * 2) })
    expect(remove).not.toHaveBeenCalled()
  })
})
