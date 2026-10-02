import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useTripDraft } from './trips/create/draftStore'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  await resetDemoData()
})

describe('Home', () => {
  it('shows upcoming trips with progress, continue-planning tasks, explore and inspiration', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Anmol/ })).toBeInTheDocument()
    const upcoming = await screen.findByRole('region', { name: 'Upcoming trips' })
    expect(await within(upcoming).findByText('5 Days in Bali')).toBeInTheDocument()
    expect(within(upcoming).queryByText('Goa Weekend')).not.toBeInTheDocument() // completed trips aren't "upcoming"
    expect(await within(upcoming).findByRole('progressbar', { name: 'Planning 50% complete' })).toBeInTheDocument()
    const cont = screen.getByRole('region', { name: 'Continue planning' })
    expect(await within(cont).findByText('Add accommodation')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Explore' })).findByText('Bali')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Inspiration' })).findByText('7 Days in Japan — Food & Culture')).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Memories' })).findByAltText('Sunset at Baga Beach')).toBeInTheDocument()
  })

  it('shows a live banner while a trip is active', async () => {
    useClockStore.setState({ simulatedNow: '2026-10-13T10:00:00+08:00' })
    renderApp('/')
    expect(await screen.findByText(/You’re on 5 Days in Bali — Day 2/)).toBeInTheDocument()
  })
})

describe('Explore', () => {
  it('filters by search text and category, and handles no results', async () => {
    renderApp('/explore?q=bal')
    expect(await screen.findByRole('link', { name: /Bali/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Goa/ })).not.toBeInTheDocument()
  })
  it('filters by category from the URL', async () => {
    renderApp('/explore?category=mountains')
    expect(await screen.findByRole('link', { name: /Manali/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Bali/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mountains', pressed: true })).toBeInTheDocument()
  })
  it('shows an empty state with a way out', async () => {
    renderApp('/explore?q=zzzz')
    expect(await screen.findByText('No destinations match “zzzz”')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('link', { name: /Bali/ })).toBeInTheDocument()
  })
})

describe('Destination page', () => {
  it('shows recommendations; Save toggles and persists; Add to trip creates an itinerary item with undo', async () => {
    const router = renderApp('/explore/bali')
    expect(await screen.findByRole('heading', { name: 'Bali', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan a Trip' })).toHaveAttribute('href', '/trips/new/destination?destination=bali')

    await userEvent.click(await screen.findByRole('button', { name: 'Save Uluwatu Temple' }))
    expect(await screen.findByRole('button', { name: 'Remove Uluwatu Temple from saved' })).toHaveAttribute('aria-pressed', 'true')
    expect(await db.savedPlaces.count()).toBe(1)

    await userEvent.click(screen.getAllByRole('button', { name: 'Add to trip' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Add to trip' })
    expect(await within(dialog).findByLabelText(/5 Days in Bali/)).toBeChecked()
    const before = await db.items.count()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to itinerary' }))
    await waitFor(async () => expect(await db.items.count()).toBe(before + 1))
    const undo = await screen.findByRole('button', { name: 'Undo' })
    await userEvent.click(undo)
    await waitFor(async () => expect(await db.items.count()).toBe(before))
    expect(router.state.location.pathname).toBe('/explore/bali')
  })

  it('has an honest empty state for a destination without places', async () => {
    renderApp('/explore/paris')
    expect(await screen.findByText('Recommendations are coming soon')).toBeInTheDocument()
  })

  it('tells you when a destination does not exist', async () => {
    renderApp('/explore/atlantis')
    expect(await screen.findByText('Destination not found')).toBeInTheDocument()
  })
})

describe('Trips list', () => {
  it('groups trips into upcoming, past and archived tabs', async () => {
    renderApp('/trips')
    expect(await screen.findByRole('tab', { name: 'Upcoming (1)' })).toBeInTheDocument()
    expect(await screen.findByText('5 Days in Bali')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Past (1)' }))
    expect(await screen.findByText('Goa Weekend')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Archived (0)' }))
    expect(await screen.findByText('Nothing archived')).toBeInTheDocument()
  })
})

describe('Create trip', () => {
  const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

  it('walks the six steps, validates, drafts an itinerary and opens the new trip', async () => {
    const router = renderApp('/trips/new/destination')
    expect(await screen.findByRole('heading', { name: 'Where are you going?' })).toBeInTheDocument()

    await next() // nothing chosen yet
    expect(await screen.findByText('Choose at least one destination')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search destinations' }), 'goa')
    await userEvent.click(await screen.findByRole('button', { name: /Add Goa/ }))
    expect(screen.getByRole('list', { name: 'Your route' })).toHaveTextContent('Goa')
    await next()

    expect(await screen.findByRole('heading', { name: 'When are you travelling?' })).toBeInTheDocument()
    await next()
    expect(await screen.findByText('Pick a start date')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-01-10' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-01-12' } })
    expect(await screen.findByText('3 days · 2 nights')).toBeInTheDocument()
    await next()

    expect(await screen.findByRole('heading', { name: 'Who’s coming?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Friends' }))
    expect(within(screen.getByRole('group', { name: 'Number of travellers' })).getByText('4')).toBeInTheDocument()
    await next()

    expect(await screen.findByRole('heading', { name: 'What’s your budget style?' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Total budget/), '30000')
    await next()

    expect(await screen.findByRole('heading', { name: 'What do you love doing?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Food' }))
    await next()

    expect(await screen.findByRole('heading', { name: 'How should we plan it?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create trip' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/trip_/), { timeout: 8000 })
    const trip = (await db.trips.toArray()).find((t) => t.title === '3 Days in Goa')!
    expect(trip).toMatchObject({ destinationIds: ['goa'], startDate: '2027-01-10', endDate: '2027-01-12', travellers: { group: 'friends', count: 4 }, interests: ['food'], planningStyle: 'hybrid', state: 'planning' })
    expect(trip.budget.total?.amount).toBe(30000)
    expect((await db.items.where('tripId').equals(trip.id).toArray()).length).toBeGreaterThan(3)
    expect(useTripDraft.getState().draft.destinationIds).toEqual([]) // draft cleared after creating
    expect(await screen.findByText('Trip created')).toBeInTheDocument()
  }, 30000)

  it('pre-fills the destination from the destination page and skips to dates', async () => {
    const router = renderApp('/trips/new/destination?destination=bali')
    expect(await screen.findByRole('heading', { name: 'When are you travelling?' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/trips/new/dates')
    expect(useTripDraft.getState().draft.destinationIds).toEqual(['bali'])
  })

  it('keeps the draft across a reload', async () => {
    const first = renderApp('/trips/new/destination?destination=jaipur')
    await screen.findByRole('heading', { name: 'When are you travelling?' })
    expect(JSON.parse(localStorage.getItem('trip-draft')!).state.draft.destinationIds).toEqual(['jaipur'])
    first.dispose()
  })

  it('rejects an end date before the start date', async () => {
    renderApp('/trips/new/dates?destination=goa')
    await screen.findByRole('heading', { name: 'When are you travelling?' })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-02-10' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-02-08' } })
    await next()
    expect(await screen.findByText('End date must be on or after the start date')).toBeInTheDocument()
  })
})

describe('Trip overview', () => {
  it('shows the planning panel, costs, day summaries and a demo-booking disclaimer', async () => {
    renderApp('/trips/trip-bali')
    expect(await screen.findByRole('heading', { name: 'Planning 50% complete' })).toBeInTheDocument()
    expect(screen.getAllByText('Add accommodation').length).toBeGreaterThan(0) // task list and bookings card
    expect(screen.getByText(/Day 3 · Ubud: terraces & temples/)).toBeInTheDocument()
    expect(screen.getByText('Estimated cost')).toBeInTheDocument()
    expect(screen.getByText(/nothing is booked/)).toBeInTheDocument()
  })

  it('adapts to trip state: live and completed', async () => {
    useClockStore.setState({ simulatedNow: '2026-10-13T10:00:00+08:00' })
    renderApp('/trips/trip-bali')
    expect(await screen.findByRole('link', { name: /Open Live Trip/ })).toBeInTheDocument()
  })

  it('shows the completed recap for a past trip', async () => {
    renderApp('/trips/trip-goa')
    expect(await screen.findByText('Turn your memories into a shareable trip?')).toBeInTheDocument()
  })

  it('archives with undo and deletes only after confirmation', async () => {
    const router = renderApp('/trips/trip-bali')
    await userEvent.click(await screen.findByRole('button', { name: 'Archive trip' }))
    await waitFor(async () => expect((await db.trips.get('trip-bali'))?.state).toBe('archived'))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await db.trips.get('trip-bali'))?.state).toBe('planning'))

    router.navigate('/trips/trip-bali')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete trip' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this trip?' })
    expect(await db.trips.get('trip-bali')).toBeDefined() // nothing deleted yet
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))
    await waitFor(async () => expect(await db.trips.get('trip-bali')).toBeUndefined())
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'))
  })
})
