import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db'
import { resetDemoData } from '../seed'
import type { PublicTrip } from '@/types'

// The real backend: Inspiration rows must come from the server, like the full feed, not from this device's leftovers.
vi.mock('@/config/env', async (original) => {
  const real = await original<typeof import('@/config/env')>()
  return { ...real, env: { ...real.env, backend: 'firebase' as const } }
})
const remote = vi.hoisted(() => ({ listPublicPage: vi.fn(), getPublicTripBySlug: vi.fn() }))
vi.mock('../remote/publicTrips', () => remote)

import { usePublicTrip } from './publicTrips'
import { usePublicTrips } from './community'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
)
const page = (id: string, over: Partial<PublicTrip> = {}) => ({ id, slug: `${id}-slug`, title: `Trip ${id}`, visibility: 'public', publishedAt: '2026-10-01T00:00:00.000Z', ...over }) as PublicTrip

beforeEach(async () => {
  remote.listPublicPage.mockReset()
  remote.getPublicTripBySlug.mockReset()
  await resetDemoData() // leaves the demo's public pages in the local cache, as an old demo-mode browser would have
})

describe('Inspiration rows on the real backend', () => {
  it('show what the server has, not the pages cached on this device', async () => {
    expect(await db.publicTrips.count()).toBeGreaterThan(0)
    remote.listPublicPage.mockResolvedValue({ items: [], nextCursor: null }) // a new project: nothing published yet
    const { result } = renderHook(() => usePublicTrips(6), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([]) // an empty row, not a row of trips that open to nothing
    expect(remote.listPublicPage).toHaveBeenCalledWith(null, 6)
  })

  it('show the server’s trips and keep them so they can be opened, saved and liked', async () => {
    remote.listPublicPage.mockResolvedValue({ items: [page('srv-1'), page('srv-2')], nextCursor: null })
    const { result } = renderHook(() => usePublicTrips(6), { wrapper })
    await waitFor(() => expect(result.current.data?.map((t) => t.id)).toEqual(['srv-1', 'srv-2']))
    expect(await db.publicTrips.get('srv-1')).toBeDefined()
  })

  it('fall back to the public pages this device has seen when the server cannot be reached', async () => {
    remote.listPublicPage.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => usePublicTrips(3), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.length).toBe(3)
    expect(result.current.data!.every((t) => t.visibility === 'public')).toBe(true)
  })

  it('report the error, rather than an empty row, when offline with nothing cached', async () => {
    await db.publicTrips.clear()
    remote.listPublicPage.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => usePublicTrips(3), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('opening a public trip on the real backend', () => {
  it('says there is no such page when the server answers that there is none, even if an old copy is cached', async () => {
    const cached = (await db.publicTrips.toArray())[0]!
    remote.getPublicTripBySlug.mockResolvedValue(undefined)
    const { result } = renderHook(() => usePublicTrip(cached.slug), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('opens a page this device has already seen when the server cannot be reached', async () => {
    const cached = (await db.publicTrips.toArray())[0]!
    remote.getPublicTripBySlug.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => usePublicTrip(cached.slug), { wrapper })
    await waitFor(() => expect(result.current.data?.id).toBe(cached.id))
  })

  it('fails (rather than pretending the page does not exist) when offline and never seen', async () => {
    remote.getPublicTripBySlug.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => usePublicTrip('never-seen'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
