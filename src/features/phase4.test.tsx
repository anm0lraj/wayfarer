import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { bookingRepo } from '@/data/repositories'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

const realMatchMedia = window.matchMedia
const wide = () => {
  window.matchMedia = ((q: string) => ({ matches: /1024/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
}

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  await resetDemoData()
})
afterEach(() => {
  window.matchMedia = realMatchMedia
  vi.restoreAllMocks()
})

describe('Hotels', () => {
  it('lists stays with price per night and total for the trip dates', async () => {
    renderApp('/trips/trip-bali/bookings/hotels')
    expect(await screen.findByRole('link', { name: 'Seminyak Garden Villas' })).toBeInTheDocument()
    expect(screen.getByText('4 stays')).toBeInTheDocument()
    // 12 → 16 Oct is 4 nights: 4 × 5,200
    expect(screen.getByText(/₹20,800 for 4 nights/)).toBeInTheDocument()
  })

  it('reflects filters in the URL and narrows the results (desktop sidebar)', async () => {
    wide()
    const router = renderApp('/trips/trip-bali/bookings/hotels')
    await screen.findByRole('link', { name: 'Coral Bay Resort' })
    const filters = screen.getByRole('complementary', { name: 'Filters' })
    await userEvent.click(within(filters).getByRole('button', { name: 'Spa' }))
    await waitFor(() => expect(screen.getByText('2 stays')).toBeInTheDocument())
    expect(router.state.location.search).toContain('amenities=Spa')
    expect(screen.queryByRole('link', { name: 'Kayu Homestay' })).not.toBeInTheDocument()
    await userEvent.click(within(filters).getByRole('button', { name: 'Within 1 km' }))
    await waitFor(() => expect(screen.getByText('1 stay')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Sunset Boutique Hotel' })).toBeInTheDocument()
  })

  it('restores filters from the URL and offers a way out of an empty result', async () => {
    renderApp('/trips/trip-bali/bookings/hotels?maxPrice=3000&minRating=4.8')
    expect(await screen.findByText('No stays match')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('4 stays')).toBeInTheDocument()
  })

  it('on a phone, filters open in a sheet', async () => {
    renderApp('/trips/trip-bali/bookings/hotels')
    await screen.findByRole('link', { name: 'Coral Bay Resort' })
    expect(screen.queryByRole('complementary', { name: 'Filters' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Pool' }))
    await userEvent.click(within(sheet).getByRole('button', { name: /^Show \d+ stays$/ }))
    await waitFor(() => expect(screen.getByText('3 stays')).toBeInTheDocument())
  })

  it('saves a hotel to the trip as a demo booking, labelled not booked, and can undo it', async () => {
    renderApp('/trips/trip-bali/bookings/hotels/h-sunset-boutique')
    expect(await screen.findByRole('heading', { name: 'Sunset Boutique Hotel' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reviews' })).toBeInTheDocument()
    // pick the deluxe room: 3800 × 1.35 = 5130/night × 4
    await userEvent.click(screen.getByRole('radio', { name: /Deluxe room/ }))
    expect(screen.getByText('₹20,520')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add hotel to trip' }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(1))
    const [b] = await db.bookings.toArray()
    expect(b).toMatchObject({ type: 'hotel', refId: 'h-sunset-boutique', status: 'saved', mode: 'demo', price: { amount: 20520, currency: 'INR' } })
    expect(b?.details).toMatchObject({ checkIn: '2026-10-12', checkOut: '2026-10-16', nights: 4, roomName: 'Deluxe room' })
    expect(await screen.findByText('Saved to trip', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getAllByText('Saved to trip — not booked').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Remove from trip' }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(0))
  })

  it('uses the stay dates from the search URL', async () => {
    renderApp('/trips/trip-bali/bookings/hotels/h-kayu-homestay?checkIn=2026-10-13&checkOut=2026-10-15')
    await screen.findByRole('heading', { name: 'Kayu Homestay' })
    await userEvent.click(screen.getByRole('button', { name: 'Add hotel to trip' }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(1))
    expect((await db.bookings.toArray())[0]).toMatchObject({ price: { amount: 4200 }, details: { nights: 2 } })
  })

  it('shows a not-found state for an unknown hotel', async () => {
    renderApp('/trips/trip-bali/bookings/hotels/nope')
    expect(await screen.findByText('Hotel not found')).toBeInTheDocument()
  })
})

describe('Flights', () => {
  it('shows outbound flights for the trip dates and saves one for all travellers', async () => {
    renderApp('/trips/trip-bali/bookings/flights')
    const list = await screen.findByRole('region', { name: 'Flight results' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(within(list).getByText('SQ 423')).toBeInTheDocument()
    expect(within(list).getAllByText('Saved to trip — not booked')).toHaveLength(3)
    await userEvent.click(within(list).getByRole('button', { name: 'Add IndiGo 6E 1049 to trip' }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(1))
    const [b] = await db.bookings.toArray()
    expect(b).toMatchObject({ type: 'flight', refId: 'f-out-3', status: 'saved', mode: 'demo', price: { amount: 31800 } })
    expect(await within(list).findByText('Saved to trip', { selector: 'span' })).toBeInTheDocument()
  })

  it('switches to the return leg and filters by route', async () => {
    const router = renderApp('/trips/trip-bali/bookings/flights')
    await screen.findByRole('region', { name: 'Flight results' })
    await userEvent.click(screen.getByRole('button', { name: 'Return' }))
    await waitFor(() => expect(router.state.location.search).toContain('leg=return'))
    const list = await screen.findByRole('region', { name: 'Flight results' })
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2))
    expect(within(list).getByText('SQ 938')).toBeInTheDocument()
  })

  it('says so when a route has no flights', async () => {
    renderApp('/trips/trip-bali/bookings/flights?from=DEL&to=BLR')
    expect(await screen.findByText('No flights found')).toBeInTheDocument()
  })
})

describe('Booking overview', () => {
  it('starts empty, and shows saved items with the demo label and a running total', async () => {
    renderApp('/trips/trip-bali/bookings')
    expect(await screen.findByText('No flights saved yet.')).toBeInTheDocument()
    expect(screen.getByText('No stay saved yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Find a hotel/ })).toHaveAttribute('href', '/trips/trip-bali/bookings/hotels')
    expect(screen.getByRole('link', { name: /Find flights/ })).toHaveAttribute('href', '/trips/trip-bali/bookings/flights')
  })

  it('saves an itinerary activity as a demo booking and lets you remove it', async () => {
    renderApp('/trips/trip-bali/bookings')
    await screen.findByRole('list', { name: 'Activities from your itinerary' })
    await userEvent.click(screen.getByRole('button', { name: /Save Kecak fire dance at Uluwatu to trip/ }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(1))
    expect((await db.bookings.toArray())[0]).toMatchObject({ type: 'activity', status: 'saved', mode: 'demo', price: { amount: 1200 } })
    const card = (await screen.findByRole('heading', { name: 'Kecak fire dance at Uluwatu' })).closest('li')!
    expect(within(card).getByText('Saved to trip — not booked')).toBeInTheDocument()
    await userEvent.click(within(card).getByRole('button', { name: /Remove Kecak fire dance at Uluwatu from trip/ }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(0))
  })
})

describe('Checklist', () => {
  it('ticks booking items itself from saved bookings', async () => {
    await bookingRepo.saveDemo({ tripId: 'trip-bali', type: 'hotel', provider: 'Demo provider', title: 'Stay', price: { amount: 1, currency: 'INR' }, startAt: '2026-10-12T06:00:00.000Z' })
    renderApp('/trips/trip-bali/checklist')
    const list = await screen.findByRole('list', { name: 'Trip checklist' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByText('1 of 8 done')).toBeInTheDocument()
    expect(within(list).getByText('From your saved bookings').closest('li')).toHaveTextContent('Hotel booked')
    expect(within(list).getByText('Flight booked').closest('li')).toHaveTextContent('Not done')
  })

  it('adds, ticks and deletes your own items', async () => {
    renderApp('/trips/trip-bali/checklist')
    await screen.findByRole('list', { name: 'Trip checklist' })
    await userEvent.type(screen.getByRole('textbox', { name: 'Add your own item' }), 'Download offline maps')
    await userEvent.click(screen.getByRole('button', { name: /^Add$/ }))
    const box = await screen.findByRole('checkbox', { name: 'Download offline maps' })
    await userEvent.click(box)
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Download offline maps' })).toBeChecked())
    expect(screen.getByText('1 of 9 done')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Download offline maps' }))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Download offline maps' })).not.toBeInTheDocument())
  })

  it('does not add an empty item', async () => {
    renderApp('/trips/trip-bali/checklist')
    await screen.findByRole('list', { name: 'Trip checklist' })
    expect(screen.getByRole('button', { name: /^Add$/ })).toBeDisabled()
  })
})
