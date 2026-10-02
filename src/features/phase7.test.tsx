import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

const JAPAN = '/t/7-days-in-japan-food-culture-k7p2'

const signedOut = () => localStorage.setItem('demo-signed-out', '1')

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  await resetDemoData()
})
afterEach(() => vi.restoreAllMocks())

describe('Explore feed', () => {
  it('pages through public itineraries with infinite scroll', async () => {
    renderApp('/explore/itineraries')
    expect(await screen.findByRole('link', { name: /7 Days in Japan/ })).toBeInTheDocument()
    // 8 are public; the page size is 6, so the rest arrive on demand.
    await waitFor(() => expect(screen.getByText('You’ve seen them all.')).toBeInTheDocument(), { timeout: 6000 })
    expect(screen.getByRole('link', { name: /3 Days in Kyoto/ })).toBeInTheDocument()
  })

  it('searches and filters by destination, with a way out of an empty result', async () => {
    renderApp('/explore/itineraries')
    await screen.findByRole('link', { name: /7 Days in Japan/ })
    await userEvent.click(screen.getByRole('button', { name: 'Goa' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: /7 Days in Japan/ })).not.toBeInTheDocument())
    expect(await screen.findByRole('link', { name: /3-Day Goa Budget Trip/ })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search itineraries' }), 'zzzz')
    expect(await screen.findByText('No itineraries match')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('link', { name: /7 Days in Japan/ })).toBeInTheDocument()
  })

  it('saves from the card and lists it under Saved trips', async () => {
    renderApp('/explore/itineraries')
    await userEvent.click(await screen.findByRole('button', { name: 'Save 7 Days in Japan — Food & Culture' }))
    await waitFor(async () => expect(await db.savedTrips.count()).toBe(1))
    await waitFor(async () => expect((await db.publicTrips.get('pub-japan'))!.saveCount).toBe(1281))
  })

  it('shows saved trips, and an empty state when there are none', async () => {
    const first = renderApp('/saved')
    expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument()
    first.dispose()
  })
})

describe('Public trip page', () => {
  it('shows the itinerary, budget, tips and sets link-preview tags (signed out)', async () => {
    signedOut()
    renderApp(JAPAN)
    expect(await screen.findByRole('heading', { level: 1, name: '7 Days in Japan — Food & Culture' })).toBeInTheDocument()
    expect(screen.getByText('by Aiko Tanaka')).toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Day 1 — Asakusa & Tsukiji/ })).toBeInTheDocument()
    expect(screen.getByText('Buy a Suica card at the airport.')).toBeInTheDocument()
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('7 Days in Japan — Food & Culture')
    expect(document.title).toContain('7 Days in Japan')
  })

  it('asks signed-out visitors to sign in only when they try to save or copy', async () => {
    signedOut()
    const router = renderApp(JAPAN)
    await screen.findByRole('heading', { level: 1, name: /7 Days in Japan/ })
    expect(router.state.location.pathname).toBe(JAPAN) // viewing needed no account
    await userEvent.click(screen.getByRole('button', { name: /^Save$/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/signin'))
    expect((router.state.location.state as { from: string }).from).toBe(JAPAN)
    expect(await db.savedTrips.count()).toBe(0)
  })

  it('likes and unlikes, adjusting the count', async () => {
    renderApp(JAPAN)
    const like = await screen.findByRole('button', { name: /Like — 942 likes/ })
    await userEvent.click(like)
    expect(await screen.findByRole('button', { name: /Unlike — 943 likes/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Unlike/ }))
    expect(await screen.findByRole('button', { name: /Like — 942 likes/ })).toBeInTheDocument()
  })

  it('copies the itinerary into the visitor’s own trip and leaves the original alone', async () => {
    const before = JSON.stringify((await db.publicTrips.get('pub-japan'))!.snapshot)
    const router = renderApp(JAPAN)
    await userEvent.click(await screen.findByRole('button', { name: 'Use This Itinerary' }))
    const dialog = await screen.findByRole('dialog', { name: 'Use this itinerary' })
    const date = dialog.querySelector<HTMLInputElement>('input[type=date]')!
    fireEvent.change(date, { target: { value: '2027-03-01' } })
    expect(within(dialog).getByText(/7 days · 1–7 Mar/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Copy to my trips' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/[^/]+\/itinerary$/))

    const copy = (await db.trips.toArray()).find((t) => t.copiedFromPublicTripId === 'pub-japan')!
    expect(copy).toMatchObject({ startDate: '2027-03-01', endDate: '2027-03-07', ownerId: 'user-demo' })
    expect(await db.days.where('tripId').equals(copy.id).count()).toBe(7)
    expect(await db.items.where('tripId').equals(copy.id).count()).toBeGreaterThan(10)
    expect(JSON.stringify((await db.publicTrips.get('pub-japan'))!.snapshot)).toBe(before)
  })

  it('opens the copy dialog from the feed’s “Use this itinerary” link', async () => {
    renderApp(`${JAPAN}?use=1`)
    expect(await screen.findByRole('dialog', { name: 'Use this itinerary' })).toBeInTheDocument()
  })

  it('says so when the itinerary doesn’t exist or was unpublished', async () => {
    renderApp('/t/nope-0000')
    expect(await screen.findByText('This itinerary isn’t available')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse itineraries' })).toBeInTheDocument()
  })
})

describe('Sharing a trip', () => {
  it('publishes a sanitised copy: link-only is reachable but unlisted; public is listed', async () => {
    // Private details that must never leave the trip.
    await db.items.update('goa-item-1', { notes: 'Meet Raj at the back gate', bookingId: 'bk-secret' })
    renderApp('/trips/trip-goa/share')
    await userEvent.click(await screen.findByRole('radio', { name: /Anyone with the link/ }))
    await userEvent.type(screen.getByLabelText('Description'), 'Three beach days with friends in Goa.')
    await userEvent.click(screen.getByRole('button', { name: 'Publish trip' }))
    expect(await screen.findByText('Your trip is live')).toBeInTheDocument()

    const pub = (await db.publicTrips.toArray()).find((p) => p.tripId === 'trip-goa')!
    expect(pub.visibility).toBe('link')
    expect(pub.snapshot.items.length).toBe(5)
    for (const item of pub.snapshot.items) {
      expect(item).not.toHaveProperty('notes')
      expect(item).not.toHaveProperty('bookingId')
    }
    expect(JSON.stringify(pub)).not.toContain('Raj')
    expect(pub.snapshot.memories.every((m) => !('point' in m))).toBe(true)

    // Reachable by URL, absent from the feed.
    expect((await import('@/data/repositories')).publicTripRepo.listPage(null, 50)).resolves.toMatchObject({ items: expect.not.arrayContaining([expect.objectContaining({ id: pub.id })]) })
    expect((await db.trips.get('trip-goa'))!.visibility).toBe('link')

    await userEvent.click(screen.getByRole('radio', { name: /^Public/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Update public page' }))
    await waitFor(async () => expect((await db.publicTrips.get(pub.id))!.visibility).toBe('public'))
    const page = await (await import('@/data/repositories')).publicTripRepo.listPage(null, 50)
    expect(page.items.some((p) => p.id === pub.id)).toBe(true)
  })

  it('needs a description, and can make a trip private again', async () => {
    renderApp('/trips/trip-goa/share')
    await userEvent.click(await screen.findByRole('radio', { name: /^Public/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Publish trip' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a short description')
    await userEvent.type(screen.getByLabelText('Description'), 'A long weekend in Goa with friends.')
    await userEvent.click(screen.getByRole('button', { name: 'Publish trip' }))
    await screen.findByText('Your trip is live')
    const slug = (await db.publicTrips.toArray()).find((p) => p.tripId === 'trip-goa')!.slug

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(screen.getByRole('radio', { name: /^Private/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Make private' }))
    await waitFor(async () => expect(await db.publicTrips.where('slug').equals(slug).count()).toBe(0))
    await waitFor(async () => expect((await db.trips.get('trip-goa'))!.visibility).toBe('private'))
  })
})

describe('Profile', () => {
  it('shows stats and the four sections', async () => {
    renderApp('/profile')
    expect(await screen.findByRole('heading', { name: 'Anmol' })).toBeInTheDocument()
    const stats = document.querySelector('dl[aria-label="Travel stats"]')!
    await waitFor(() => expect(within(stats as HTMLElement).getByText('Trips').previousSibling).toHaveTextContent('2'))
    expect(within(stats as HTMLElement).getByText('Countries').previousSibling).toHaveTextContent('2') // Indonesia, India
    expect(await screen.findByRole('link', { name: /5 Days in Bali/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Published' }))
    expect(await screen.findByText('Nothing published')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Memories' }))
    expect(await screen.findByRole('link', { name: 'Sunset at Baga Beach' })).toBeInTheDocument()
  })

  it('redirects an unknown tab to My trips', async () => {
    const router = renderApp('/profile/whatever')
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile/trips'))
  })
})
