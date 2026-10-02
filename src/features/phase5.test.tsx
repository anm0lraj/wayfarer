import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { defaultServices, type Services } from '@/services'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

const DAY1_MORNING = '2026-10-12T08:30:00+08:00'
const DAY2_MIDMORNING = '2026-10-13T10:30:00+08:00' // Uluwatu Temple (10:00–12:00) is running
const WEEK_BEFORE = '2026-10-05T09:00:00+08:00'

const simulate = (iso: string | null) => useClockStore.setState({ simulatedNow: iso })

const geo = (over: Partial<Services['geolocation']>): Partial<Services> => ({
  geolocation: { isSupported: () => true, permission: async () => 'prompt', getPosition: async () => ({ lat: -8.69, lng: 115.16 }), watch: () => () => {}, ...over },
})

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  simulate(null)
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  await resetDemoData()
})
afterEach(() => vi.restoreAllMocks())

describe('Live Trip', () => {
  it('says the trip isn’t live yet, and points to the demo simulator', async () => {
    simulate(WEEK_BEFORE)
    renderApp('/trips/trip-bali/live')
    expect(await screen.findByText('Live Trip starts on 12 Oct')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Try the demo date simulator' })).toHaveAttribute('href', '/settings')
  })

  it('greets with the first activity and offers directions to it', async () => {
    simulate(DAY1_MORNING)
    renderApp('/trips/trip-bali/live')
    expect(await screen.findByRole('heading', { level: 1, name: 'You’re in Bali' })).toBeInTheDocument()
    expect(screen.getByText('Good morning. Your first activity starts at 9:30 AM.')).toBeInTheDocument()
    const nav = await screen.findByRole('link', { name: /Navigate to Next/ })
    expect(nav.getAttribute('href')).toMatch(/-8\.7467/) // Ngurah Rai airport
    expect(nav).toHaveAttribute('target', '_blank')
  })

  it('shows what is happening now and what is next, from the clock', async () => {
    simulate(DAY2_MIDMORNING)
    renderApp('/trips/trip-bali/live')
    expect(await screen.findByText('Happening now')).toBeInTheDocument()
    expect(screen.getAllByText('Uluwatu Temple').length).toBeGreaterThan(0)
    expect(screen.getByText(/Up next: Seafood lunch at Jimbaran Grill House/)).toBeInTheDocument()
  })

  it('marks an activity done, saves it, and lets you undo', async () => {
    simulate(DAY2_MIDMORNING)
    renderApp('/trips/trip-bali/live')
    await userEvent.click(await screen.findByRole('button', { name: /Mark done/ }))
    await waitFor(async () => expect((await db.items.get('item-d2-2'))?.status).toBe('completed'))
    expect(await screen.findByText('Next up')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await db.items.get('item-d2-2'))?.status).toBe('upcoming'))
  })

  it('never decides an old activity was completed — it asks', async () => {
    simulate('2026-10-13T12:30:00+08:00')
    renderApp('/trips/trip-bali/live')
    expect(await screen.findByText('Still marked upcoming')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Skip Uluwatu Temple' }))
    await waitFor(async () => expect((await db.items.get('item-d2-2'))?.status).toBe('skipped'))
  })

  it('opens any of the five statuses from the timeline', async () => {
    simulate(DAY1_MORNING)
    renderApp('/trips/trip-bali/live')
    await userEvent.click(await screen.findByRole('button', { name: /Lunch at Warung Sari Rasa.*Change status/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Lunch at Warung Sari Rasa' })
    expect(within(sheet).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'))).toHaveLength(5)
    await userEvent.click(within(sheet).getByRole('button', { name: /On the way/ }))
    await waitFor(async () => expect((await db.items.get('item-d1-3'))?.status).toBe('on_the_way'))
  })

  it('shows emergency numbers that work offline', async () => {
    simulate(DAY1_MORNING)
    renderApp('/trips/trip-bali/live')
    await userEvent.click(await screen.findByRole('button', { name: /Open emergency info/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Emergency information' })
    expect(within(sheet).getByRole('link', { name: 'Call Police, 110' })).toHaveAttribute('href', 'tel:110')
  })

  describe('location', () => {
    it('does not ask the browser until you press the button', async () => {
      simulate(DAY1_MORNING)
      const getPosition = vi.fn(async () => ({ lat: -8.69, lng: 115.16 }))
      renderApp('/trips/trip-bali/live', geo({ getPosition }))
      expect(await screen.findByRole('heading', { name: /Use your location/ })).toBeInTheDocument()
      expect(getPosition).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole('button', { name: 'Use my location' }))
      expect(await screen.findByRole('heading', { name: 'Location is on' })).toBeInTheDocument()
      expect(getPosition).toHaveBeenCalledTimes(1)
    })

    it('handles a denied permission without nagging', async () => {
      simulate(DAY1_MORNING)
      renderApp('/trips/trip-bali/live', geo({ getPosition: () => Promise.reject({ code: 1 }) }))
      await userEvent.click(await screen.findByRole('button', { name: 'Use my location' }))
      expect(await screen.findByRole('heading', { name: 'Location is blocked' })).toBeInTheDocument()
      // The rest of the screen still works.
      expect(await screen.findByRole('link', { name: /Navigate to Next/ })).toBeInTheDocument()
    })

    it('explains when the browser has no location support', async () => {
      simulate(DAY1_MORNING)
      renderApp('/trips/trip-bali/live', geo({ isSupported: () => false }))
      expect(await screen.findByRole('heading', { name: 'Location isn’t available' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Use my location' })).not.toBeInTheDocument()
    })

    it('only suggests starting an activity when you are really at it', async () => {
      simulate(DAY1_MORNING)
      // Standing at Ngurah Rai airport, where the first activity is.
      renderApp('/trips/trip-bali/live', geo({ getPosition: async () => ({ lat: -8.7467, lng: 115.1668 }) }))
      await userEvent.click(await screen.findByRole('button', { name: 'Use my location' }))
      expect(await screen.findByText(/You look to be at/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Start it' }))
      await waitFor(async () => expect((await db.items.get('item-d1-1'))?.status).toBe('in_progress'))
    })
  })
})

describe('Notifications', () => {
  it('delivers the 7-day countdown once, even across visits', async () => {
    simulate(WEEK_BEFORE)
    renderApp('/notifications')
    expect(await screen.findByText('Your Bali trip starts in 7 days.')).toBeInTheDocument()
    await waitFor(async () => expect(await db.notifications.filter((n) => n.key === 'countdown:trip-bali:7').count()).toBe(1))
    // A second session on the same day must not add a duplicate.
    renderApp('/notifications')
    await screen.findAllByText('Your Bali trip starts in 7 days.')
    expect(await db.notifications.filter((n) => n.key === 'countdown:trip-bali:7').count()).toBe(1)
  })

  it('respects per-type switches', async () => {
    const user = await db.users.toCollection().first()
    await db.users.put({ ...user!, settings: { ...user!.settings, notificationPrefs: { ...user!.settings.notificationPrefs, trip_countdown: false } } })
    simulate(WEEK_BEFORE)
    renderApp('/notifications')
    await screen.findByRole('heading', { name: 'Notifications' })
    await new Promise((r) => setTimeout(r, 300))
    expect(await db.notifications.filter((n) => n.key === 'countdown:trip-bali:7').count()).toBe(0)
  })

  it('opens the notification and marks it read', async () => {
    renderApp('/notifications')
    const link = await screen.findByRole('link', { name: /Day 3 may be too busy/ })
    await userEvent.click(link)
    await waitFor(async () => expect((await db.notifications.get('ntf-2'))?.readAt).toBeTruthy())
  })

  it('never asks for browser permission on its own, and explains first', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const)
    const notifications = { ...defaultServices.notifications, getPermission: () => 'default' as const, requestPermission }
    renderApp('/notifications', { notifications })
    expect(await screen.findByRole('heading', { name: 'Get reminders on your device?' })).toBeInTheDocument()
    expect(requestPermission).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Turn on notifications' }))
    expect(requestPermission).toHaveBeenCalledTimes(1)
  })

  it('lets you turn a type off in Settings', async () => {
    renderApp('/settings')
    const toggle = await screen.findByRole('switch', { name: /Busy days/ })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    await waitFor(async () => expect((await db.users.toCollection().first())?.settings.notificationPrefs.busy_day).toBe(false))
  })
})
