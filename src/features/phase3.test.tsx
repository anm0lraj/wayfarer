import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { itineraryRepo, tripRepo } from '@/data/repositories'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { useClockStore } from '@/services/clock/clock'
import { createFakeMap } from '@/test/fakeMap'
import { settle } from '@/test/settle'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

const realMatchMedia = window.matchMedia
/** Pretend the viewport is desktop-wide (≥1024px) so split view and the docked assistant are used. */
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
afterEach(async () => {
  window.matchMedia = realMatchMedia
  vi.restoreAllMocks()
  await settle() // let the last repository steps finish before the next test resets the database
})

const dayItems = async (dayId: string) => (await db.items.where('dayId').equals(dayId).toArray()).sort((a, b) => a.position - b.position)
const openMenu = async (name: string | RegExp) => userEvent.click(await screen.findByRole('button', { name }))
const pick = async (name: string | RegExp) => userEvent.click(await screen.findByRole('menuitem', { name }))

describe('Itinerary: viewing', () => {
  it('shows a day with times, travel legs, a day switcher and an Add button', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1')
    expect(await screen.findByRole('heading', { name: 'Day 1 · Arrival & Seminyak' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Day 1 activities' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(6)
    expect(within(list).getByText('09:30')).toBeInTheDocument()
    expect(within(list).getAllByText(/\d+ min · [\d.]+ km/).length).toBeGreaterThan(2)
    const days = screen.getByRole('navigation', { name: 'Days' })
    expect(within(days).getAllByRole('link')).toHaveLength(5)
    expect(within(days).getByRole('link', { name: /Day 1/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Add activity/ })).toHaveAttribute('href', '/trips/trip-bali/itinerary/day/1/add')
  })

  it('redirects /itinerary to day 1 and unknown days to day 1', async () => {
    const r = renderApp('/trips/trip-bali/itinerary')
    await screen.findByRole('heading', { name: /Day 1/ })
    expect(r.state.location.pathname).toBe('/trips/trip-bali/itinerary/day/1')
  })

  it('warns when there is too little travel time and "Re-time day" fixes it', async () => {
    await itineraryRepo.updateItem('item-d1-2', { startTime: '10:30' }) // airport ends 10:15
    renderApp('/trips/trip-bali/itinerary/day/1')
    expect(await screen.findByText(/This schedule gives you only 15 minutes to travel between these locations\. Recommended travel time: \d+ minutes\./)).toBeInTheDocument()
    expect(screen.getByText(/1 timing issue/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Re-time day' }))
    await waitFor(() => expect(screen.queryByText(/This schedule gives you only/)).not.toBeInTheDocument())
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('has an empty state for a day with nothing planned', async () => {
    const trip = await tripRepo.create({ title: '2 Days in Goa', destinationIds: ['goa'], startDate: '2027-03-01', endDate: '2027-03-02', timezone: 'Asia/Kolkata', travellers: { group: 'solo', count: 1 }, budget: { tier: 'economy' }, interests: [], planningStyle: 'manual' })
    renderApp(`/trips/${trip.id}/itinerary/day/1`)
    expect(await screen.findByText('Nothing planned for Day 1')).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown activity', async () => {
    renderApp('/trips/trip-bali/itinerary/items/nope')
    expect(await screen.findByText('We can’t find that activity')).toBeInTheDocument()
  })
})

describe('Itinerary: editing', () => {
  it('reorders with the menu, instantly, and persists', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1')
    await openMenu('Actions for Arrive at Ngurah Rai Airport')
    await pick('Move down')
    await waitFor(async () => expect((await dayItems('day-1'))[1]!.id).toBe('item-d1-1'))
    const titles = within(screen.getByRole('list', { name: 'Day 1 activities' })).getAllByRole('listitem').map((li) => li.textContent)
    expect(titles[1]).toContain('Arrive at Ngurah Rai Airport')
  })

  it('rolls back and says so when a move fails', async () => {
    vi.spyOn(itineraryRepo, 'reorder').mockRejectedValueOnce(new Error('disk full'))
    renderApp('/trips/trip-bali/itinerary/day/1')
    await openMenu('Actions for Arrive at Ngurah Rai Airport')
    await pick('Move down')
    expect(await screen.findByText('Couldn’t reorder')).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Day 1 activities' })).getAllByRole('listitem')[0]).toHaveTextContent('Arrive at Ngurah Rai Airport'))
    expect((await dayItems('day-1'))[0]!.id).toBe('item-d1-1')
  })

  it('moves an activity to another day, with undo', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1')
    await openMenu('Actions for Dinner at Kayu Lantern')
    await pick(/Day 2/)
    await waitFor(async () => expect((await db.items.get('item-d1-6'))?.dayId).toBe('day-2'))
    expect(await screen.findByText('Moved to Day 2')).toBeInTheDocument()
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none')) // Radix releases the page after the menu closes
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await db.items.get('item-d1-6'))?.dayId).toBe('day-1'))
  })

  it('duplicates, and deletes with an undo that restores the same position', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1')
    await openMenu('Actions for Lunch at Warung Sari Rasa')
    await pick('Duplicate')
    await waitFor(async () => expect((await dayItems('day-1')).map((i) => i.title)).toContain('Lunch at Warung Sari Rasa (copy)'))

    await openMenu('Actions for Hotel check-in, Seminyak')
    await pick('Delete')
    await waitFor(async () => expect(await db.items.get('item-d1-2')).toBeUndefined())
    const deleted = (await screen.findByText('Activity deleted')).closest('li')! // the duplicate toast has its own Undo
    await userEvent.click(within(deleted).getByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await dayItems('day-1'))[1]!.id).toBe('item-d1-2'))
  })

  it('opens details from a card, edits and saves', async () => {
    const r = renderApp('/trips/trip-bali/itinerary/day/1')
    const list = await screen.findByRole('list', { name: 'Day 1 activities' })
    console.log('DBTITLES', JSON.stringify((await db.items.where('dayId').equals('day-1').toArray()).map((i) => i.id + ':' + i.title)))
    await userEvent.click(await within(list).findByRole('button', { name: /^Lunch at Warung Sari Rasa/ })) // the card, not its Reorder/Actions buttons
    const dialog = await screen.findByRole('dialog', { name: 'Lunch at Warung Sari Rasa' })
    expect(r.state.location.pathname).toBe('/trips/trip-bali/itinerary/items/item-d1-3')
    fireEvent.change(within(dialog).getByLabelText('Duration (min)'), { target: { value: '90' } })
    await userEvent.type(within(dialog).getByLabelText('Notes'), 'Table by the window')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(async () => expect(await db.items.get('item-d1-3')).toMatchObject({ durationMin: 90, notes: 'Table by the window' }))
    await waitFor(() => expect(r.state.location.pathname).toBe('/trips/trip-bali/itinerary/day/1'))
  })

  it('rejects an invalid duration in details', async () => {
    renderApp('/trips/trip-bali/itinerary/items/item-d1-3')
    const dialog = await screen.findByRole('dialog', { name: 'Lunch at Warung Sari Rasa' })
    fireEvent.change(within(dialog).getByLabelText('Duration (min)'), { target: { value: '2' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await within(dialog).findByText('Enter 5–1440 minutes')).toBeInTheDocument()
    expect((await db.items.get('item-d1-3'))!.durationMin).toBe(75)
  })

  it('notes a reservation as the user’s own, never as a booking we made', async () => {
    renderApp('/trips/trip-bali/itinerary/items/item-d2-5')
    const dialog = await screen.findByRole('dialog', { name: 'Kecak fire dance at Uluwatu' })
    await userEvent.type(within(dialog).getByLabelText('Booked with'), 'GetYourGuide')
    await userEvent.type(within(dialog).getByLabelText('Confirmation reference'), 'GYG-4471')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add reservation' }))
    expect(await within(dialog).findByText('Noted by you — not verified')).toBeInTheDocument()
    const booking = (await db.bookings.toArray())[0]!
    expect(booking).toMatchObject({ type: 'activity', mode: 'demo', status: 'saved', provider: 'GetYourGuide' })
  })
})

describe('Add activity', () => {
  it('adds a catalogue place at the end of the day and marks it added', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1/add')
    const dialog = await screen.findByRole('dialog', { name: 'Add to Day 1' })
    const before = (await dayItems('day-1')).length
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Add Sacred Monkey Forest Sanctuary' }))
    await waitFor(async () => expect((await dayItems('day-1')).length).toBe(before + 1))
    expect(await within(dialog).findByRole('button', { name: /Sacred Monkey Forest Sanctuary is already in Day 1/ })).toBeDisabled()
    const added = (await dayItems('day-1')).at(-1)!
    expect(added).toMatchObject({ placeId: 'p-monkey-forest', source: 'user' })
    expect(added.startTime >= '20:00').toBe(true) // after the last stop, not overlapping it
  })

  it('searches places', async () => {
    renderApp('/trips/trip-bali/itinerary/day/1/add')
    const dialog = await screen.findByRole('dialog', { name: 'Add to Day 1' })
    await userEvent.type(await within(dialog).findByRole('searchbox'), 'waterfall')
    expect(await within(dialog).findByText('Tukad Cepung Waterfall')).toBeInTheDocument()
    expect(within(dialog).queryByText('Sacred Monkey Forest Sanctuary')).not.toBeInTheDocument()
  })

  it('adds a custom activity with its own location, and validates', async () => {
    const r = renderApp('/trips/trip-bali/itinerary/day/1/add')
    const dialog = await screen.findByRole('dialog', { name: 'Add to Day 1' })
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Custom' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add activity' }))
    expect(await within(dialog).findByText('Give it a name')).toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('Name'), 'Beach picnic')
    fireEvent.change(within(dialog).getByLabelText('Latitude (optional)'), { target: { value: '-8.69' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add activity' }))
    expect(await within(dialog).findByText('Enter both latitude and longitude')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Longitude (optional)'), { target: { value: '115.16' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add activity' }))

    const find = async () => (await dayItems('day-1')).find((i) => i.title === 'Beach picnic')
    await waitFor(async () => expect((await find())?.travelTimeFromPrevMin).toBeDefined()) // legs are recomputed for the new stop
    expect((await find())!.customLocation?.point).toEqual({ lat: -8.69, lng: 115.16 })
    await waitFor(() => expect(r.state.location.pathname).toBe('/trips/trip-bali/itinerary/day/1'))
  })
})

describe('AI itinerary generation and day regeneration', () => {
  it('drafts a whole itinerary for an empty trip, previews it, then adds it', async () => {
    const trip = await tripRepo.create({ title: '3 Days in Bali', destinationIds: ['bali'], startDate: '2027-03-01', endDate: '2027-03-03', timezone: 'Asia/Makassar', travellers: { group: 'couple', count: 2 }, budget: { tier: 'comfort' }, interests: ['food', 'beaches'], planningStyle: 'manual' })
    renderApp(`/trips/${trip.id}/itinerary/day/1`)
    await userEvent.click(await screen.findByRole('button', { name: /Draft itinerary/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Draft an itinerary' })
    const add = await within(dialog).findByRole('button', { name: 'Add to my trip' }, { timeout: 5000 })
    expect(await db.items.where('tripId').equals(trip.id).count()).toBe(0) // preview only: nothing saved yet
    await userEvent.click(add)
    await waitFor(async () => expect(await db.items.where('tripId').equals(trip.id).count()).toBeGreaterThan(5))
  })

  it('shows an unavailable state and keeps the plan unchanged', async () => {
    localStorage.setItem('mock-ai-unavailable', '1')
    renderApp('/trips/trip-bali/itinerary/day/1')
    await openMenu('Day options')
    await pick('Draft whole itinerary')
    expect(await screen.findByText('The AI assistant isn’t available right now', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(await db.items.where('tripId').equals('trip-bali').count()).toBe(26)
  })

  it('regenerates one day: shows current vs proposed, replaces only on confirm, and can undo', async () => {
    renderApp('/trips/trip-bali/itinerary/day/2')
    await openMenu('Day options')
    await pick('Regenerate this day')
    const dialog = await screen.findByRole('dialog', { name: 'Regenerate Day 2' })
    await within(dialog).findByText('Proposed', undefined, { timeout: 5000 })
    expect(within(dialog).getByText('Current')).toBeInTheDocument()
    const original = (await dayItems('day-2')).map((i) => i.id)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace this day' }))
    await waitFor(async () => expect((await dayItems('day-2')).every((i) => i.source === 'ai')).toBe(true))
    expect((await dayItems('day-2')).map((i) => i.id)).not.toEqual(original)
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect((await dayItems('day-2')).map((i) => i.id)).toEqual(original))
  })
})

describe('Map', () => {
  it('shows numbered stops and the route for a day, and selecting a stop shows actions', async () => {
    const fake = createFakeMap()
    const r = renderApp('/trips/trip-bali/map?day=1', { maps: fake.maps })
    await waitFor(() => expect(fake.state.markers.filter((m) => m.label).map((m) => m.label)).toEqual(['1', '2', '3', '4', '5', '6']))
    expect(fake.state.route).toHaveLength(6)
    expect(fake.state.markers[2]!.ariaLabel).toBe('Stop 3: Lunch at Warung Sari Rasa')

    fake.click('item-d1-3') // click the pin → URL + panel
    const card = await screen.findByRole('article', { name: 'Lunch at Warung Sari Rasa' })
    await waitFor(() => expect(r.state.location.search).toContain('item=item-d1-3'))
    expect(within(card).getByRole('link', { name: 'Navigate' }).getAttribute('href')).toMatch(/google\.com\/maps|maps\.apple\.com/)
    expect(within(card).getByRole('link', { name: 'Directions' })).toBeInTheDocument()
    await waitFor(() => expect(fake.state.markers.find((m) => m.id === 'item-d1-3')?.selected).toBe(true))
  })

  it('lists stops so the map is not the only way in, and selecting one from the list works', async () => {
    const fake = createFakeMap()
    renderApp('/trips/trip-bali/map', { maps: fake.maps })
    const stops = await screen.findByRole('region', { name: 'Stops' })
    await waitFor(async () => expect((await within(stops).findAllByRole('button')).length).toBeGreaterThan(7))
    await userEvent.click(within(stops).getAllByRole('button')[7]!)
    await waitFor(() => expect(fake.state.flownTo).toBeDefined())
  })

  it('toggles nearby places, and a nearby place can be saved and added to the itinerary', async () => {
    const fake = createFakeMap()
    renderApp('/trips/trip-bali/map?day=1', { maps: fake.maps })
    await waitFor(() => expect(fake.state.markers.length).toBeGreaterThan(5))
    const before = fake.state.markers.length
    await userEvent.click(screen.getByRole('button', { name: /Nearby places/ }))
    await waitFor(() => expect(fake.state.markers.length).toBeGreaterThan(before))
    const nearbyId = fake.state.markers.find((m) => m.id.startsWith('place:'))!.id
    fake.click(nearbyId)
    const card = await screen.findByRole('article', { name: /./ })
    await userEvent.click(within(card).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect(await db.savedPlaces.count()).toBe(1))
    const items = await db.items.where('tripId').equals('trip-bali').count()
    await userEvent.click(within(card).getByRole('button', { name: /Add to Day 1/ }))
    await waitFor(async () => expect(await db.items.where('tripId').equals('trip-bali').count()).toBe(items + 1))
  })

  it('"View on map" from a suggestion shows that place', async () => {
    const fake = createFakeMap()
    renderApp('/trips/trip-bali/map?place=p-uluwatu-temple', { maps: fake.maps })
    expect(await screen.findByRole('article', { name: 'Uluwatu Temple' })).toBeInTheDocument()
    await waitFor(() => expect(fake.state.markers.some((m) => m.id === 'place:p-uluwatu-temple')).toBe(true))
  })

  it('degrades to a list with a clear message when the map cannot load', async () => {
    const fake = createFakeMap()
    fake.maps.provider.create = () => Promise.reject(new Error('blocked'))
    renderApp('/trips/trip-bali/map?day=1', { maps: fake.maps })
    expect(await screen.findByText('The map isn’t available right now')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Stops' })).toBeInTheDocument()
  })

  it('wide screens show the map beside the itinerary, kept in sync both ways', async () => {
    wide()
    const fake = createFakeMap()
    renderApp('/trips/trip-bali/itinerary/day/1', { maps: fake.maps })
    await waitFor(() => expect(fake.state.markers.filter((m) => m.label)).toHaveLength(6))
    await userEvent.click(await screen.findByRole('button', { name: /^Lunch at Warung Sari Rasa/ })) // list → map
    await waitFor(() => expect(fake.state.markers.find((m) => m.id === 'item-d1-3')?.selected).toBe(true))
    expect(fake.state.flownTo).toBeDefined()
    fake.click('item-d1-5') // map → list
    await waitFor(() => expect(screen.getByRole('button', { name: /^Sunset at Seminyak Beach/ })).toHaveAttribute('aria-current', 'true'))
  })
})

describe('AI assistant', () => {
  it('answers with the trip’s context, proposes actions, and changes nothing until you confirm', async () => {
    const r = renderApp('/trips/trip-bali/ai')
    expect(await screen.findByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument()
    expect(await screen.findByText('5 Days in Bali')).toBeInTheDocument()
    const before = await db.items.where('dayId').equals('day-3').count()

    await userEvent.click(await screen.findByRole('button', { name: 'Add a sunset viewpoint to Day 3' }))
    // The reply streams word by word; the proposal cards appear once the finished message is saved.
    const card = await screen.findByRole('group', { name: 'Add to itinerary' }, { timeout: 8000 })
    expect(screen.getByText(/sunset spots in Bali/)).toBeInTheDocument()
    expect(await db.items.where('dayId').equals('day-3').count()).toBe(before) // proposal only

    await userEvent.click(within(card).getByRole('button', { name: 'Add to Day 3' }))
    await waitFor(async () => expect(await db.items.where('dayId').equals('day-3').count()).toBe(before + 1))
    expect((await db.items.where('dayId').equals('day-3').toArray()).some((i) => i.source === 'ai')).toBe(true)
    expect(await within(card).findByText('Done')).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(await db.items.where('dayId').equals('day-3').count()).toBe(before))
    expect(await within(card).findByText('Undone')).toBeInTheDocument()

    // the conversation was saved and the URL points at it
    await waitFor(() => expect(r.state.location.pathname).toMatch(/^\/trips\/trip-bali\/ai\/conv_/))
    expect(await db.aiMessages.count()).toBe(2)
  }, 20000)

  it('asks for confirmation before removing something', async () => {
    renderApp('/trips/trip-bali/ai')
    await userEvent.type(await screen.findByLabelText('Message the assistant'), 'Make Day 2 less hectic{Enter}')
    const card = await screen.findByRole('group', { name: 'Remove activity' }, { timeout: 8000 })
    const count = await db.items.where('dayId').equals('day-2').count()
    await userEvent.click(within(card).getByRole('button', { name: 'Remove' }))
    expect(await db.items.where('dayId').equals('day-2').count()).toBe(count) // still there: needs a second confirmation
    await userEvent.click(within(card).getByRole('button', { name: 'Yes, remove it' }))
    await waitFor(async () => expect(await db.items.where('dayId').equals('day-2').count()).toBe(count - 1))
  }, 20000)

  it('previews a suggested route as before/after and applies it only when asked', async () => {
    renderApp('/trips/trip-bali/ai')
    await userEvent.type(await screen.findByLabelText('Message the assistant'), 'Find the shortest route for Day 3{Enter}')
    const card = await screen.findByRole('group', { name: /Shorter route|New order/ }, { timeout: 8000 }).catch(() => null)
    if (!card) { expect(await screen.findByText(/already in a sensible order/)).toBeInTheDocument(); return }
    expect(within(card).getByText('Proposed')).toBeInTheDocument()
    const before = (await db.items.where('dayId').equals('day-3').toArray()).sort((a, b) => a.position - b.position).map((i) => i.id)
    await userEvent.click(within(card).getByRole('button', { name: 'Apply this order' }))
    await waitFor(async () => expect((await db.items.where('dayId').equals('day-3').toArray()).sort((a, b) => a.position - b.position).map((i) => i.id)).not.toEqual(before))
  }, 20000)

  it('shows an unavailable state and recovers on retry', async () => {
    localStorage.setItem('mock-ai-unavailable', '1')
    renderApp('/trips/trip-bali/ai')
    await userEvent.type(await screen.findByLabelText('Message the assistant'), 'What should I do next?{Enter}')
    expect(await screen.findByText('The assistant is unavailable right now.', undefined, { timeout: 8000 })).toBeInTheDocument()
    localStorage.removeItem('mock-ai-unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/Next up is/, undefined, { timeout: 8000 })).toBeInTheDocument()
    expect(screen.queryByText('The assistant is unavailable right now.')).not.toBeInTheDocument()
  }, 20000)

  it('general chat defaults to the trip you are most likely on and lets you switch to none', async () => {
    renderApp('/ai')
    const select = (await screen.findByLabelText('Trip for context')) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe('trip-bali'))
    await userEvent.selectOptions(select, 'none')
    expect(await screen.findByText(/General travel questions/)).toBeInTheDocument()
  })

  it('docks beside the trip on desktop, remembers it, and resizes from the keyboard', async () => {
    wide()
    renderApp('/trips/trip-bali', { maps: createFakeMap().maps })
    const toggle = await screen.findByRole('button', { name: 'Assistant' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(await screen.findByRole('complementary', { name: 'AI assistant' })).toBeInTheDocument()
    const sep = screen.getByRole('separator', { name: 'Resize assistant panel' })
    expect(sep).toHaveAttribute('aria-valuenow', '400')
    sep.focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(sep).toHaveAttribute('aria-valuenow', '424')
    expect(useAIPanel.getState()).toMatchObject({ open: true, width: 424 })
    await userEvent.click(screen.getByRole('button', { name: 'Close assistant' }))
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'AI assistant' })).not.toBeInTheDocument())
  })

  it('on a phone the Assistant button opens the full-screen route', async () => {
    renderApp('/trips/trip-bali')
    expect(await screen.findByRole('link', { name: 'Assistant' })).toHaveAttribute('href', '/trips/trip-bali/ai')
  })
})
