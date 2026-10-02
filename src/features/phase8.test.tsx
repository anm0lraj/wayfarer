import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { usePwa } from '@/lib/pwa'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  usePwa.setState({ needRefresh: false, installEvent: null, installed: false, applyUpdate: undefined })
  await resetDemoData()
})
afterEach(() => vi.restoreAllMocks())

describe('Available offline', () => {
  it('marks the trip, reports what is stored, and can be turned off', async () => {
    renderApp('/trips/trip-bali')
    await userEvent.click(await screen.findByRole('button', { name: 'Make available offline' }))
    expect(await screen.findByRole('heading', { name: 'Available offline' })).toBeInTheDocument()
    expect((await db.trips.get('trip-bali'))!.offlineAvailable).toBe(true)
    expect(await screen.findByText(/5 days · \d+ stops · \d+ stays/)).toBeInTheDocument()
    expect(screen.getByText(/Map tiles are cached as you view them/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
    await waitFor(async () => expect((await db.trips.get('trip-bali'))!.offlineAvailable).toBe(false))
  })
})

describe('Onboarding', () => {
  it('walks four short steps and saves preferences', async () => {
    const router = renderApp('/onboarding')
    const name = await screen.findByLabelText('What should we call you?')
    await userEvent.clear(name)
    await userEvent.type(name, 'Priya')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Foodie' }))
    await userEvent.click(screen.getByRole('radio', { name: /Premium/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Nightlife' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.click(await screen.findByRole('button', { name: '7 days' }))
    await userEvent.click(screen.getByRole('button', { name: 'Finish' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    const user = (await db.users.toCollection().first())!
    expect(user.name).toBe('Priya')
    expect(user.preferences).toMatchObject({ travelStyle: 'Foodie', budgetRange: 'premium', typicalDurationDays: 7 })
    expect(user.preferences.interests).toContain('nightlife')
  })

  it('requires a name on the first step but lets you skip everything', async () => {
    const router = renderApp('/onboarding/you')
    const name = await screen.findByLabelText('What should we call you?')
    await userEvent.clear(name)
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Tell us what to call you.')).toBeInTheDocument()
    const before = (await db.users.toCollection().first())!
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect((await db.users.toCollection().first())!.preferences).toEqual(before.preferences)
  })
})

describe('Navigation accessibility', () => {
  it('titles the page, moves focus to the content and announces it after navigating', async () => {
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    await userEvent.click(screen.getAllByRole('link', { name: 'Explore' })[0]!)
    await waitFor(() => expect(document.title).toBe('Explore · Wayfarer'), { timeout: 3000 })
    await waitFor(() => expect(document.getElementById('main')).toHaveFocus())
  })

  it('names the trip tab in the title', async () => {
    renderApp('/trips/trip-bali/itinerary')
    await waitFor(() => expect(document.title).toBe('Itinerary · 5 Days in Bali · Wayfarer'), { timeout: 4000 })
  })

  it('titles onboarding, which sits outside the app shell', async () => {
    renderApp('/onboarding/you')
    await screen.findByLabelText('What should we call you?')
    await waitFor(() => expect(document.title).toBe('Welcome to Wayfarer · Wayfarer'), { timeout: 3000 })
  })

  it('does not steal focus from an open sheet (itinerary details are a sheet on the same page)', async () => {
    renderApp('/trips/trip-bali/itinerary/items/item-d1-3')
    const dialog = await screen.findByRole('dialog')
    await new Promise((r) => setTimeout(r, 500))
    expect(dialog.contains(document.activeElement)).toBe(true)
  })
})

describe('App updates', () => {
  it('offers a reload when a new version is ready, and applies it only when asked', async () => {
    const apply = vi.fn(async () => {})
    renderApp('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/new version of Wayfarer/)).not.toBeInTheDocument()
    act(() => usePwa.setState({ needRefresh: true, applyUpdate: apply }))
    expect(await screen.findByText(/new version of Wayfarer is ready/)).toBeInTheDocument()
    expect(apply).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Reload to update' }))
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it('Settings explains how to install when the browser gives no install button', async () => {
    renderApp('/settings')
    expect(await screen.findByText(/Add to Home Screen/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install Wayfarer' })).not.toBeInTheDocument()
  })
})

describe('Delete account', () => {
  it('removes local data after confirmation and returns to sign in', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const router = renderApp('/settings')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete account and data' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    expect(await db.trips.count()).toBe(0)
  })
})
