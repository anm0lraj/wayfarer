import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { bookingRepo, checklistRepo, itineraryRepo } from '@/data/repositories'
import { resetDemoData } from '@/data/seed'
import { searchTransit } from '@/data/transit'
import { installMockApi } from '@/mocks/install'
import { bookingService } from '@/services/bookings/mock'
import { renderApp } from '@/test/renderApp'
import { settle } from '@/test/settle'
import { summariseOffline } from './offline/offlineTrip'
import { transitBookingInput } from './bookings/transit'
import { localOptionStop, localOptions } from './bookings/localTransport'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  await resetDemoData()
})
afterEach(() => vi.restoreAllMocks())

const day1 = async () => (await db.items.where('dayId').equals('day-1').toArray()).sort((a, b) => a.position - b.position)
const saveTransit = (mode: 'train' | 'bus', from: string, to: string) => {
  const [s] = searchTransit(mode, from, to, '2026-10-12')
  return bookingRepo.saveDemo({ ...transitBookingInput(s!, 'trip-bali', 2), provider: 'Demo provider' })
}

describe('Buses', () => {
  it('lists the sample timetable with the demo notice, saves one as "not booked" and can remove it', async () => {
    renderApp('/trips/trip-bali/bookings/buses')
    const list = await screen.findByRole('region', { name: 'Bus results' })
    expect(within(list).getByText('Executive bus + ferry')).toBeInTheDocument()
    expect(within(list).getByText(/Gilimanuk–Ketapang ferry/)).toBeInTheDocument()
    expect(within(list).getByText('Saved to trip — not booked')).toBeInTheDocument()
    expect(screen.getByText('Sample timetable for the demo. Times and fares are not live.')).toBeInTheDocument()
    expect(screen.queryByText(/confirmed|purchased/i)).not.toBeInTheDocument()

    await userEvent.click(within(list).getByRole('button', { name: 'Add Executive bus + ferry B07 to trip' }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(1))
    const [b] = await db.bookings.toArray()
    expect(b).toMatchObject({ type: 'bus', refId: 'bs-B07-PBY-UBG-2026-10-12', status: 'saved', mode: 'demo', provider: 'Demo provider', price: { amount: 2600, currency: 'INR' } })
    expect(await within(list).findByText('Saved to trip', { selector: 'span' })).toBeInTheDocument()
    expect(await screen.findByText(/not booked/, { selector: '[data-radix-collection-item] *' })).toBeInTheDocument()

    await userEvent.click(within(list).getByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect(await db.bookings.count()).toBe(0))
  })
})

describe('Trains', () => {
  it('searches from the URL, sorts by price and writes the sort back to the URL', async () => {
    const router = renderApp('/trips/trip-bali/bookings/trains?from=delhi&to=jaipur&date=2026-10-12&travellers=3')
    const list = await screen.findByRole('region', { name: 'Train results' })
    expect(within(list).getAllByRole('listitem').filter((li) => li.tagName === 'LI')).toHaveLength(2)
    expect(within(list).getByText('3 travellers · ₹890 each')).toBeInTheDocument()
    expect(within(list).getByText('₹2,670')).toBeInTheDocument()
    await userEvent.click(within(list).getByRole('button', { name: 'Cheapest' }))
    await waitFor(() => expect(router.state.location.search).toContain('sort=price'))
    expect(router.state.location.search).toContain('from=delhi')
    const names = within(list).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent ?? '')
    expect(names[0]).toMatch(/Ajmer Shatabdi/)
  })

  it('swaps the two places', async () => {
    const router = renderApp('/trips/trip-bali/bookings/trains?from=delhi&to=jaipur')
    await screen.findByRole('region', { name: 'Train results' })
    await userEvent.click(screen.getByRole('button', { name: 'Swap places' }))
    await waitFor(() => expect(router.state.location.search).toContain('from=jaipur&to=delhi'))
  })

  it('a saved train ticks the getting-there checklist item, which reads "Train or bus saved to trip"', async () => {
    renderApp('/trips/trip-bali/checklist')
    const list = await screen.findByRole('list', { name: 'Trip checklist' })
    expect(within(list).getByText('Flight booked').closest('li')).toHaveTextContent('Not done')
    await saveTransit('train', 'delhi', 'jaipur')
    expect((await checklistRepo.list('trip-bali')).find((i) => i.autoRule === 'flight_booked')).toMatchObject({ done: true, label: 'Train or bus saved to trip' })
  })

  it('keeps "Flight booked" when there is a flight as well, and ignores a cancelled ticket', async () => {
    const train = await saveTransit('train', 'delhi', 'jaipur')
    const rule = async () => (await checklistRepo.list('trip-bali')).find((i) => i.autoRule === 'flight_booked')!
    await db.bookings.put({ ...train, status: 'cancelled' })
    expect(await rule()).toMatchObject({ done: false, label: 'Flight booked' })
    await db.bookings.put({ ...train, status: 'saved' })
    await bookingRepo.saveDemo({ tripId: 'trip-bali', type: 'flight', provider: 'Demo provider', title: 'SQ 423', price: { amount: 1, currency: 'INR' }, startAt: '2026-10-12T09:30:00+08:00', refId: 'f-out-1' })
    expect(await rule()).toMatchObject({ done: true, label: 'Flight booked' })
  })

  it('counts towards planning progress and the overview', async () => {
    await saveTransit('bus', 'bali', 'surabaya')
    renderApp('/trips/trip-bali')
    expect(await screen.findByText('Trains & buses', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('1 saved')).toBeInTheDocument()
    const costs = screen.getByText('Estimated cost').closest('div')!.parentElement!
    expect(within(costs).getByText('Trains & buses').nextSibling).toHaveTextContent('₹2,600')
    expect(screen.getByText(/Flights, trains, buses and stays are saved to the trip as demo entries — nothing is booked/)).toBeInTheDocument()
  })

  it('shows trains and buses on the bookings overview with a local options link', async () => {
    await saveTransit('train', 'delhi', 'jaipur')
    renderApp('/trips/trip-bali/bookings')
    expect(await screen.findByRole('heading', { name: 'Trains' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Buses' })).toBeInTheDocument()
    expect(screen.getByText(/Ajmer Shatabdi \(12015\) · NDLS → JP/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find buses' })).toHaveAttribute('href', '/trips/trip-bali/bookings/buses')
    expect(screen.getByRole('link', { name: /Local options between stops/ })).toHaveAttribute('href', '/trips/trip-bali/bookings/local')
  })

  it('counts saved trains and buses in the offline summary', async () => {
    await saveTransit('train', 'delhi', 'jaipur')
    await saveTransit('bus', 'bali', 'surabaya')
    expect(await summariseOffline('trip-bali')).toMatchObject({ flights: 0, transit: 2 })
  })
})

describe('Fallbacks and states', () => {
  it('falls back to local options when no train runs, and adding one books nothing', async () => {
    renderApp('/trips/trip-bali/bookings/trains?from=udaipur&to=jodhpur&date=2026-10-12')
    expect(await screen.findByText('No direct trains found')).toBeInTheDocument()
    const local = await screen.findByRole('region', { name: 'Local options' })
    expect(within(local).getByText('Cab')).toBeInTheDocument()
    expect(within(local).getByText('Estimate')).toBeInTheDocument()
    expect(within(local).getByText(/not quotes/i)).toBeInTheDocument()
    expect(within(local).queryByText('Saved to trip — not booked')).not.toBeInTheDocument()
    await userEvent.click(within(local).getByRole('button', { name: 'Add Cab to itinerary' }))
    await waitFor(async () => expect((await db.items.where('tripId').equals('trip-bali').toArray()).some((i) => /^Cab: Udaipur → Jodhpur/.test(i.title))).toBe(true))
    const added = (await db.items.toArray()).find((i) => i.title.startsWith('Cab: Udaipur'))!
    expect(added).toMatchObject({ category: 'transport', dayId: 'day-1' })
    expect(added.customLocation).toBeUndefined()
    expect(added.placeId).toBeUndefined()
    expect(await db.bookings.count()).toBe(0)
  })

  it('says "Too far for local transport" and points to flights', async () => {
    renderApp('/trips/trip-bali/bookings/trains')
    expect(await screen.findByText('Too far for local transport')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Look at flights/ })).toHaveAttribute('href', '/trips/trip-bali/bookings/flights')
  })

  it('asks for two different places', async () => {
    renderApp('/trips/trip-bali/bookings/buses?from=goa&to=goa')
    expect(await screen.findByText('Choose two different places')).toBeInTheDocument()
  })

  it('offers a retry when the search fails', async () => {
    const searchTrains = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(searchTransit('train', 'delhi', 'jaipur', '2026-10-12'))
    renderApp('/trips/trip-bali/bookings/trains?from=delhi&to=jaipur', { bookings: { ...bookingService, searchTrains } })
    expect(await screen.findByText('Couldn’t load trains')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('region', { name: 'Train results' })).toBeInTheDocument()
  })

  it('says it needs a connection when the search fails offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    renderApp('/trips/trip-bali/bookings/trains?from=delhi&to=jaipur', { bookings: { ...bookingService, searchTrains: () => Promise.reject(new Error('offline')) } })
    expect(await screen.findByText('You’re offline')).toBeInTheDocument()
  })
})

describe('Local options page', () => {
  it('lets you pick two stops when none are in the URL', async () => {
    const router = renderApp('/trips/trip-bali/bookings/local')
    expect(await screen.findByText('Choose two stops')).toBeInTheDocument()
    await userEvent.selectOptions(await screen.findByLabelText('From stop'), 'item-d1-3')
    await userEvent.selectOptions(screen.getByLabelText('To stop'), 'item-d1-4')
    await waitFor(() => expect(router.state.location.search).toBe('?fromItem=item-d1-3&toItem=item-d1-4'))
    expect(await screen.findByRole('region', { name: 'Local options' })).toBeInTheDocument()
  })

  it('inserts the chosen option between the two stops and keeps the legs around it', async () => {
    renderApp('/trips/trip-bali/bookings/local?fromItem=item-d1-3&toItem=item-d1-4')
    const local = await screen.findByRole('region', { name: 'Local options' })
    expect(within(local).queryByLabelText('Add to day')).not.toBeInTheDocument()
    const before = await day1()
    await userEvent.click(within(local).getByRole('button', { name: 'Add Cab to itinerary' }))
    expect(await within(local).findByText('Added to itinerary')).toBeInTheDocument()
    await waitFor(async () => expect(await day1()).toHaveLength(before.length + 1))
    await settle()
    const after = await day1()
    expect(after.map((i) => i.position)).toEqual(after.map((_, i) => i))
    expect(after.slice(0, 3).map((i) => i.id)).toEqual(before.slice(0, 3).map((i) => i.id))
    expect(after[3]).toMatchObject({ category: 'transport', title: expect.stringMatching(/^Cab: .* → /) })
    expect(after.slice(4).map((i) => i.id)).toEqual(before.slice(3).map((i) => i.id))
    // The stop has no place of its own, so the next real stop still measures from the real one before it.
    expect(after[3]!.travelTimeFromPrevMin).toBeUndefined()
    expect(after[4]!.distanceFromPrevKm).toBe(before[3]!.distanceFromPrevKm)
  })

  it('compares two cities and says when they are too far apart', async () => {
    renderApp('/trips/trip-bali/bookings/local?by=cities&from=delhi&to=mumbai')
    expect(await screen.findByText('Too far for local transport')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('To'), 'jaipur')
    const local = await screen.findByRole('region', { name: 'Local options' })
    expect(within(local).getByText('Cab')).toBeInTheDocument()
    expect(within(local).getByLabelText('Add to day')).toBeInTheDocument()
  })

  it('links from each travel leg of the itinerary to the stops it connects', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1')
    const links = await screen.findAllByRole('link', { name: /^Local options for the leg to/ })
    expect(links.length).toBeGreaterThan(1)
    expect(links[0]).toHaveAttribute('href', '/trips/trip-bali/bookings/local?fromItem=item-d1-1&toItem=item-d1-2')
  })
})

describe('itineraryRepo.addItem at an index', () => {
  const input = () => {
    const a = { lat: 26.9124, lng: 75.7873 }
    return localOptionStop(localOptions(a, { lat: a.lat + 0.05, lng: a.lng }, 'jaipur').options[0]!, 'A', 'B', '10:00')
  }

  it('inserts, shifts the rest down, clamps and finishes with the legs refreshed', async () => {
    const before = await day1()
    const item = await itineraryRepo.addItem('trip-bali', 'day-1', input(), 2)
    const after = await day1()
    expect(item.position).toBe(2)
    expect(after.map((i) => i.id)).toEqual([...before.slice(0, 2).map((i) => i.id), item.id, ...before.slice(2).map((i) => i.id)])
    expect(after.map((i) => i.position)).toEqual(after.map((_, i) => i))

    const last = await itineraryRepo.addItem('trip-bali', 'day-1', input(), 999)
    const first = await itineraryRepo.addItem('trip-bali', 'day-1', input(), -4)
    const all = await day1()
    expect(all[0]!.id).toBe(first.id)
    expect(all[all.length - 1]!.id).toBe(last.id)
    // Without an index it still appends.
    const appended = await itineraryRepo.addItem('trip-bali', 'day-1', input())
    expect((await day1()).at(-1)!.id).toBe(appended.id)
  })
})
