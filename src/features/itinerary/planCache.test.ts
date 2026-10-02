import { describe, expect, it } from 'vitest'
import { optimisticMove, optimisticRemove, optimisticReorder, optimisticUpdate } from './planCache'
import type { TripPlan } from '@/data/queries/plan'
import type { ItineraryItem } from '@/types'

const it_ = (id: string, dayId: string, position: number) => ({ id, dayId, position, title: id }) as ItineraryItem
const plan = {
  days: [{ id: 'd1', dayNumber: 1 }, { id: 'd2', dayNumber: 2 }],
  items: [it_('a', 'd1', 0), it_('b', 'd1', 1), it_('c', 'd1', 2), it_('x', 'd2', 0)],
  bookings: [], progress: { percent: 0, tasks: [] },
} as unknown as TripPlan
const ids = (p: TripPlan, day: string) => p.items.filter((i) => i.dayId === day).map((i) => `${i.id}:${i.position}`)

describe('optimistic plan updaters', () => {
  it('reorders within a day and renumbers positions', () => {
    expect(ids(optimisticReorder(plan, 'd1', ['c', 'a', 'b']), 'd1')).toEqual(['c:0', 'a:1', 'b:2'])
  })
  it('moves between days, closing the gap and inserting at the index', () => {
    const moved = optimisticMove(plan, 'b', 'd2', 0)
    expect(ids(moved, 'd1')).toEqual(['a:0', 'c:1'])
    expect(ids(moved, 'd2')).toEqual(['b:0', 'x:1'])
    expect(ids(optimisticMove(plan, 'a', 'd2'), 'd2')).toEqual(['x:0', 'a:1']) // default: end of day
  })
  it('removes and renumbers; updates in place', () => {
    expect(ids(optimisticRemove(plan, 'a'), 'd1')).toEqual(['b:0', 'c:1'])
    expect(optimisticUpdate(plan, 'a', { title: 'Renamed' }).items[0]!.title).toBe('Renamed')
  })
  it('does not mutate the original plan', () => {
    optimisticRemove(plan, 'a')
    expect(plan.items).toHaveLength(4)
  })
})
