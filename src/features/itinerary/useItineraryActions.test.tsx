import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToastStore } from '@/components/feedback/toast'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import { db } from '@/data/db'
import type { TripPlan } from '@/data/queries/plan'
import { itineraryRepo } from '@/data/repositories'
import { resetDemoData } from '@/data/seed'
import { useItineraryActions } from './useItineraryActions'

const key = ['trips', 'trip-bali', 'plan']

async function setup() {
  const qc = new QueryClient()
  const [days, items] = await Promise.all([itineraryRepo.listDays('trip-bali'), itineraryRepo.listItems('trip-bali')])
  const plan = { days, items, bookings: [], progress: {} } as unknown as TripPlan
  qc.setQueryData(key, plan)
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useItineraryActions('trip-bali'), { wrapper })
  return { qc, plan, actions: result.current }
}

beforeEach(async () => {
  setActorId(DEMO_USER_ID)
  await resetDemoData()
  vi.restoreAllMocks()
})

describe('moving an activity to another day', () => {
  it('rolls the screen back and says so when the move fails, leaving the stored days untouched', async () => {
    const { qc, plan, actions } = await setup()
    const item = plan.items.find((i) => i.id === 'item-d1-2')!
    const stored = await db.items.toArray()
    vi.spyOn(db.syncQueue, 'add').mockRejectedValue(new Error('disk full'))
    await act(async () => { await actions.moveToDay(item, 'day-2', 2, 0) })
    expect(qc.getQueryData<TripPlan>(key)!.items).toEqual(plan.items)
    expect(useToastStore.getState().items.map((t) => t.title)).toContain('Couldn’t move that')
    expect(await db.items.toArray()).toEqual(stored)
  })

  it('offers an Undo that puts it back where it was', async () => {
    const { actions, plan } = await setup()
    const item = plan.items.find((i) => i.id === 'item-d1-2')!
    await act(async () => { await actions.moveToDay(item, 'day-2', 2, 0) })
    expect((await db.items.get(item.id))!.dayId).toBe('day-2')
    const toast = useToastStore.getState().items.find((t) => t.title === 'Moved to Day 2')!
    await act(async () => { toast.action!.onClick(); await vi.waitFor(async () => expect((await db.items.get(item.id))!.dayId).toBe('day-1')) })
    expect((await db.items.get(item.id))!.position).toBe(item.position)
  })
})
