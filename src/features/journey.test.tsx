import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

const at = (iso: string | null) => act(() => useClockStore.setState({ simulatedNow: iso }))

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  await resetDemoData()
})

/**
 * Spec §39 on the real router, from "a week before" to "someone else copies it".
 * Steps 1–7 (creating and editing the plan) are covered screen by screen in the phase 2–4 tests; this walks the
 * part of the journey that spans features, which is where integration breaks.
 */
describe('Bali journey: prepare → live → capture → publish → reuse', () => {
  it('works end to end', async () => {
    // Step 9 — seven days out: the trip shows its countdown and the preparation checklist.
    at('2026-10-05T09:00:00+08:00')
    const router = renderApp('/trips/trip-bali')
    expect(await screen.findByRole('heading', { level: 1, name: '5 Days in Bali' })).toBeInTheDocument()
    expect(await screen.findByText(/7 days to go|You’re set|Planning/)).toBeInTheDocument()
    await act(() => router.navigate('/trips/trip-bali/checklist'))
    expect(await screen.findByRole('heading', { name: 'Before you go' })).toBeInTheDocument()
    // …and the notification engine says so, once.
    await waitFor(async () => expect(await db.notifications.filter((n) => n.key === 'countdown:trip-bali:7').count()).toBe(1))

    // Steps 10–13 — trip day: Live, the greeting, the first activity, mark it done.
    at('2026-10-12T08:30:00+08:00')
    await act(() => router.navigate('/trips/trip-bali/live'))
    expect(await screen.findByText('Good morning. Your first activity starts at 9:30 AM.')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Navigate to Next/ })).toHaveAttribute('target', '_blank')
    at('2026-10-12T09:40:00+08:00')
    await userEvent.click(await screen.findByRole('button', { name: /Mark done/ }))
    await waitFor(async () => expect((await db.items.get('item-d1-1'))!.status).toBe('completed'))

    // Step 14 — a memory captured now lands under Day 1, on the activity that was happening.
    await userEvent.click(await screen.findByRole('link', { name: /Add memory/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Note/ }))
    await userEvent.type(screen.getByLabelText('Your note'), 'Landed. Humid, golden light.')
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips/trip-bali/memories'), { timeout: 10_000 })
    const memory = (await db.memories.where('tripId').equals('trip-bali').toArray())[0]!
    expect(memory).toMatchObject({ dayId: 'day-1', itemId: 'item-d1-1' })
    expect(await screen.findByRole('heading', { name: /Day 1/ })).toBeInTheDocument()

    // Step 15 — a story from that memory.
    await userEvent.click(screen.getByRole('link', { name: /Create story/ }))
    await userEvent.type(await screen.findByLabelText('Title'), 'Day 1 — Bali')
    await userEvent.click(await screen.findByRole('button', { name: /Landed/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save story' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/stories\/story_/))
    expect(await screen.findByRole('dialog', { name: 'Story: Day 1 — Bali' })).toBeInTheDocument()

    // Step 16 — after the trip: the completion prompt offers to share.
    at('2026-10-17T09:00:00+08:00')
    await act(() => router.navigate('/trips/trip-bali'))
    expect(await screen.findByText('Turn your memories into a shareable trip?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Share this trip' }))

    // Step 17 — publish; the public page gets its own URL.
    await userEvent.click(await screen.findByRole('radio', { name: /^Public/ }))
    await userEvent.type(screen.getByLabelText('Description'), 'Five days of sunsets, temples and street food in Bali.')
    await userEvent.click(screen.getByRole('button', { name: 'Publish trip' }))
    expect(await screen.findByText('Your trip is live')).toBeInTheDocument()
    const published = (await db.publicTrips.toArray()).find((p) => p.tripId === 'trip-bali')!
    expect(published.slug).toMatch(/^5-days-in-bali-[a-z0-9]{4}$/)
    expect(published.snapshot.items.length).toBeGreaterThan(20)

    // Step 18 — someone else opens the link (signed out), is asked to sign in only to copy, then copies it.
    await act(() => router.navigate(`/t/${published.slug}`))
    expect(await screen.findByRole('heading', { level: 1, name: '5 Days in Bali' })).toBeInTheDocument()
    await act(async () => { localStorage.setItem('demo-signed-out', '1') })
    const countBefore = await db.trips.count()
    await userEvent.click(screen.getByRole('button', { name: 'Use This Itinerary' }))
    // Signed in again (the demo sign-in), the same click now opens the copy dialog.
    await act(() => router.navigate(`/t/${published.slug}?use=1`))
    const dialog = await screen.findByRole('dialog', { name: 'Use this itinerary' })
    fireEvent.change(dialog.querySelector('input[type=date]')!, { target: { value: '2027-02-01' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Copy to my trips' }))
    await waitFor(async () => expect(await db.trips.count()).toBe(countBefore + 1))
    const copy = (await db.trips.toArray()).find((t) => t.copiedFromPublicTripId === published.id)!
    expect(copy.startDate).toBe('2027-02-01')
    await waitFor(async () => expect(await db.items.where('tripId').equals(copy.id).count()).toBe(published.snapshot.items.length))
    expect((await db.trips.get('trip-bali'))!.id).toBe('trip-bali') // the original is untouched
  }, 60_000)
})
