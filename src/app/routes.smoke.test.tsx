import { screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from '@/features/ai/panelStore'
import { useTripDraft } from '@/features/trips/create/draftStore'

/**
 * Every screen in spec §40 must render real content at its URL: a level-1 heading (or a titled dialog), no leftover placeholder,
 * no crash. This is the cheap guard against a screen silently regressing to a stub or an error boundary.
 */
const SIGNED_IN = [
  '/', '/trips', '/trips/new/destination', '/explore', '/explore/itineraries', '/explore/bali', '/ai', '/profile', '/profile/saved', '/saved',
  '/settings', '/notifications', '/onboarding/you',
  '/trips/trip-bali', '/trips/trip-bali/itinerary', '/trips/trip-bali/itinerary/day/2', '/trips/trip-bali/map', '/trips/trip-bali/bookings',
  '/trips/trip-bali/bookings/hotels', '/trips/trip-bali/bookings/hotels/h-sunset-boutique', '/trips/trip-bali/bookings/flights', '/trips/trip-bali/checklist',
  '/trips/trip-bali/memories', '/trips/trip-bali/memories/new', '/trips/trip-bali/stories/new', '/trips/trip-bali/share', '/trips/trip-bali/ai',
  '/trips/trip-goa/stories/story-goa-1',
]
const PUBLIC = ['/t/7-days-in-japan-food-culture-k7p2', '/signin', '/explore/itineraries', '/privacy', '/terms']

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  await resetDemoData()
})

async function expectRealScreen() {
  // Full-screen flows (Create Trip) are dialogs, named by their title instead of a page heading.
  await waitFor(() => expect(document.querySelectorAll('h1, [role="dialog"][aria-labelledby]').length).toBeGreaterThan(0), { timeout: 4000 })
  expect(document.body.textContent).not.toMatch(/arrives in Phase|Something went wrong|can.t find that page/)
}

describe('routes render real screens', () => {
  it.each(SIGNED_IN)('%s', async (path) => {
    renderApp(path)
    await expectRealScreen()
  })

  it.each(PUBLIC)('%s (signed out)', async (path) => {
    localStorage.setItem('demo-signed-out', '1')
    renderApp(path)
    await expectRealScreen()
  })

  it('Live Trip renders while a trip is active', async () => {
    useClockStore.setState({ simulatedNow: '2026-10-13T10:30:00+08:00' })
    renderApp('/trips/trip-bali/live')
    await expectRealScreen()
  })

  // A page that is nothing but a state (not found, not live, error) still needs a level-1 heading that names it.
  it.each(['/trips/nope', '/trips/trip-bali/live', '/explore/atlantis', '/definitely/not/here', '/trips/nope/live'])('state-only page %s has an h1', async (path) => {
    renderApp(path)
    await waitFor(() => expect(document.querySelectorAll('h1').length).toBe(1), { timeout: 4000 })
  })

  it('signed-out: an unpublished public trip has an h1', async () => {
    localStorage.setItem('demo-signed-out', '1')
    renderApp('/t/nope-0000')
    await waitFor(() => expect(document.querySelectorAll('h1').length).toBe(1), { timeout: 4000 })
  })

  it('unknown URLs get a helpful 404', async () => {
    renderApp('/definitely/not/here')
    expect(await screen.findByText('We can’t find that page')).toBeInTheDocument()
  })
})
