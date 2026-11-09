import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServicesProvider } from '@/services'
import type { GeocodeResult, GeocodingService } from '@/services/geocoding/types'
import { createFakeMap } from '@/test/fakeMap'
import type { CustomLocation } from '@/types'
import { LocationPicker } from './LocationPicker'

const near = { lat: -8.65, lng: 115.2 }
const petitenget: GeocodeResult = { id: 'a', name: 'Petitenget Beach', address: 'Seminyak, Bali, Indonesia', point: { lat: -8.6742, lng: 115.1566 } }
const monkeyForest: GeocodeResult = { id: 'b', name: 'Monkey Forest', address: 'Ubud, Bali, Indonesia', point: { lat: -8.5188, lng: 115.2588 } }

function stubGeocoder(overrides: Partial<GeocodingService> = {}) {
  return {
    attribution: 'Test attribution',
    search: vi.fn<GeocodingService['search']>(async () => [petitenget, monkeyForest]),
    reverse: vi.fn<GeocodingService['reverse']>(async (point) => ({ id: 'r', name: 'Warung Sari', address: 'Ubud, Bali', point })),
    ...overrides,
  }
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
  act(() => { window.dispatchEvent(new Event(online ? 'online' : 'offline')) })
}

/** The picker as a form would use it: the value lives in the parent. */
function setup(options: { geocoding?: GeocodingService; initial?: CustomLocation; onSubmit?: () => void } = {}) {
  const geocoding = options.geocoding ?? stubGeocoder()
  const fake = createFakeMap()
  const changes: Array<CustomLocation | undefined> = []
  const nameOnlyChanges: Array<string | undefined> = []
  function Harness() {
    const [value, setValue] = useState(options.initial)
    const [nameOnly, setNameOnly] = useState<string>()
    return (
      <form onSubmit={(e) => { e.preventDefault(); options.onSubmit?.() }}>
        <LocationPicker
          value={value} onChange={(v) => { changes.push(v); setValue(v) }} near={near}
          nameOnly={nameOnly} onNameOnlyChange={(v) => { nameOnlyChanges.push(v); setNameOnly(v) }} fallbackName="Beach picnic"
        />
      </form>
    )
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ServicesProvider services={{ geocoding, maps: fake.maps }}><Harness /></ServicesProvider>
    </QueryClientProvider>,
  )
  return { geocoding, fake, changes, nameOnlyChanges }
}

const searchBox = () => screen.getByRole('combobox', { name: 'Location' })

let geolocation: { getCurrentPosition: ReturnType<typeof vi.fn>; watchPosition: ReturnType<typeof vi.fn> }
beforeEach(() => {
  geolocation = { getCurrentPosition: vi.fn(), watchPosition: vi.fn() }
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation })
})
afterEach(() => {
  // @ts-expect-error: put jsdom back as it was
  delete navigator.geolocation
  setOnline(true)
})

describe('LocationPicker: search', () => {
  it('searches after a pause, shows matches with their addresses, and chooses one with a click', async () => {
    const { geocoding, changes } = setup()
    await userEvent.type(searchBox(), 'petit')
    const list = await screen.findByRole('listbox', { name: 'Matching places' })
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['Petitenget BeachSeminyak, Bali, Indonesia', 'Monkey ForestUbud, Bali, Indonesia'])
    expect(screen.getByText('Test attribution')).toBeInTheDocument()
    expect(geocoding.search).toHaveBeenCalledTimes(1) // typed five letters, asked once
    expect(geocoding.search).toHaveBeenCalledWith('petit', near, expect.any(AbortSignal))
    await userEvent.click(within(list).getByRole('option', { name: /Petitenget Beach/ }))
    expect(changes).toEqual([{ name: 'Petitenget Beach', address: 'Seminyak, Bali, Indonesia', point: petitenget.point }])
    const card = screen.getByRole('group', { name: 'Chosen location' })
    expect(card).toHaveTextContent('Petitenget Beach')
    expect(card).toHaveTextContent('Seminyak, Bali, Indonesia')
    expect(card).toHaveTextContent('-8.67420, 115.15660')
  })

  it('works with the keyboard: arrows move, Enter chooses, and Enter never submits the form', async () => {
    const onSubmit = vi.fn()
    const { changes } = setup({ onSubmit })
    const box = searchBox()
    await userEvent.type(box, 'bali')
    await screen.findByRole('listbox')
    expect(box).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{ArrowDown}')
    expect(box).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id)
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}') // wraps
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowUp}') // and back
    await userEvent.keyboard('{Enter}')
    expect(changes[0]?.name).toBe('Monkey Forest')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter with nothing highlighted takes the first match, and Escape closes the list only', async () => {
    const { changes } = setup()
    await userEvent.type(searchBox(), 'bali')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    expect(searchBox()).toHaveAttribute('aria-expanded', 'false')
    expect(changes).toEqual([])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(changes[0]?.name).toBe('Petitenget Beach')
  })

  it('waits for 3 characters, saying so, and does not search for less', async () => {
    const { geocoding } = setup()
    await userEvent.type(searchBox(), 'ba')
    expect(await screen.findByText(/Keep typing/)).toBeInTheDocument()
    await act(async () => { await new Promise((r) => setTimeout(r, 500)) })
    expect(geocoding.search).not.toHaveBeenCalled()
    await userEvent.type(searchBox(), 'l')
    await waitFor(() => expect(geocoding.search).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/Keep typing/)).not.toBeInTheDocument()
  })

  it('debounces: typing on within 350 ms does not search for the halfway text', async () => {
    const { geocoding } = setup()
    await userEvent.type(searchBox(), 'tegal')
    await userEvent.type(searchBox(), 'lalang')
    await screen.findByRole('listbox')
    expect(vi.mocked(geocoding.search).mock.calls.map((c) => c[0])).toEqual(['tegallalang'])
  })

  it('answers the same search again from the cache', async () => {
    const { geocoding } = setup()
    await userEvent.type(searchBox(), 'bali')
    await screen.findByRole('listbox')
    await userEvent.click(screen.getAllByRole('option')[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Clear location' }))
    await userEvent.type(searchBox(), 'bali')
    await screen.findByRole('listbox')
    expect(geocoding.search).toHaveBeenCalledTimes(1)
  })

  it('shows a skeleton while searching', async () => {
    let finish: ((r: GeocodeResult[]) => void) | undefined
    setup({ geocoding: stubGeocoder({ search: () => new Promise((resolve) => { finish = resolve }) }) })
    await userEvent.type(searchBox(), 'bali')
    expect(await screen.findByRole('status', { name: 'Searching places' })).toBeInTheDocument()
    await waitFor(() => expect(finish).toBeDefined()) // the request goes out after the pause; the skeleton is there meanwhile
    expect(screen.getByRole('status', { name: 'Searching places' })).toBeInTheDocument()
    await act(async () => finish!([petitenget]))
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Searching places' })).not.toBeInTheDocument()
  })
})

describe('LocationPicker: when there is nothing to choose', () => {
  it('says so when nothing matches and offers the text as a name only, which stays off the map', async () => {
    const { nameOnlyChanges, changes } = setup({ geocoding: stubGeocoder({ search: vi.fn(async () => []) }) })
    await userEvent.type(searchBox(), 'my cousin’s house')
    expect(await screen.findByText(/No places found for “my cousin’s house”/)).toBeInTheDocument()
    expect(screen.getByText('It will not appear on the map.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Use “my cousin’s house” as the name only' }))
    expect(nameOnlyChanges).toEqual(['my cousin’s house'])
    expect(changes.at(-1)).toBeUndefined()
    const card = screen.getByRole('group', { name: 'Place name only' })
    expect(card).toHaveTextContent('my cousin’s house')
    expect(card).toHaveTextContent('It will not appear on the map')
    await waitFor(() => expect(card).toHaveFocus())
  })

  it('shows an error with Try again, and retrying shows the results', async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValue([petitenget])
    setup({ geocoding: stubGeocoder({ search }) })
    await userEvent.type(searchBox(), 'petit')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Couldn’t search for places right now.')
    expect(screen.getByRole('button', { name: /as the name only/ })).toBeInTheDocument()
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('option', { name: /Petitenget Beach/ })).toBeInTheDocument()
    expect(search).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not search while offline, says so, and still offers the name only and coordinates', async () => {
    const { geocoding } = setup()
    setOnline(false)
    await userEvent.type(searchBox(), 'petit')
    expect(await screen.findByText(/You’re offline, so place search isn’t available/)).toBeInTheDocument()
    expect(geocoding.search).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Use “petit” as the name only' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enter coordinates/ })).toBeInTheDocument()
  })

  it('shows searches it already has while offline', async () => {
    const { geocoding } = setup()
    await userEvent.type(searchBox(), 'petit')
    await screen.findByRole('listbox')
    await userEvent.clear(searchBox())
    setOnline(false)
    await userEvent.type(searchBox(), 'petit')
    expect(await screen.findByRole('option', { name: /Petitenget Beach/ })).toBeInTheDocument()
    expect(geocoding.search).toHaveBeenCalledTimes(1)
  })
})

describe('LocationPicker: the chosen place', () => {
  it('moves focus to the card after choosing, and back to the search field after Clear', async () => {
    const { changes } = setup()
    await userEvent.type(searchBox(), 'bali')
    await userEvent.click(await screen.findByRole('option', { name: /Petitenget Beach/ }))
    await waitFor(() => expect(screen.getByRole('group', { name: 'Chosen location' })).toHaveFocus())
    await userEvent.click(screen.getByRole('button', { name: 'Clear location' }))
    expect(changes.at(-1)).toBeUndefined()
    await waitFor(() => expect(searchBox()).toHaveFocus())
    expect(screen.queryByRole('group', { name: 'Chosen location' })).not.toBeInTheDocument()
  })

  it('never asks for the device location, through search, the map or coordinates', async () => {
    setup()
    await userEvent.type(searchBox(), 'bali')
    await userEvent.click(await screen.findByRole('option', { name: /Petitenget Beach/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Adjust on map' }))
    await screen.findByRole('dialog', { name: 'Choose on map' })
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled()
    expect(geolocation.watchPosition).not.toHaveBeenCalled()
  })
})

describe('LocationPicker: coordinates', () => {
  const open = () => userEvent.click(screen.getByRole('button', { name: /Enter coordinates/ }))

  it('is collapsed until asked for', async () => {
    setup()
    expect(screen.getByRole('button', { name: /Enter coordinates/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument()
    await open()
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument()
  })

  it('validates both numbers and their ranges, then makes a pin named after the activity', async () => {
    const { changes } = setup()
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'Use these coordinates' }))
    expect(screen.getByText('Enter a latitude')).toBeInTheDocument()
    expect(screen.getByText('Enter a longitude')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Latitude'), '95')
    await userEvent.type(screen.getByLabelText('Longitude'), '200')
    await userEvent.click(screen.getByRole('button', { name: 'Use these coordinates' }))
    expect(screen.getByText('Latitude is between −90 and 90')).toBeInTheDocument()
    expect(screen.getByText('Longitude is between −180 and 180')).toBeInTheDocument()
    expect(changes).toEqual([])
    await userEvent.clear(screen.getByLabelText('Latitude'))
    await userEvent.type(screen.getByLabelText('Latitude'), '-8.69')
    await userEvent.clear(screen.getByLabelText('Longitude'))
    await userEvent.type(screen.getByLabelText('Longitude'), '115.16{Enter}') // Enter applies; it does not submit the form
    expect(changes).toEqual([{ name: 'Beach picnic', point: { lat: -8.69, lng: 115.16 } }])
    await waitFor(() => expect(screen.getByRole('group', { name: 'Chosen location' })).toHaveFocus())
  })

  it('uses the name typed for the pin when there is one', async () => {
    const { changes } = setup()
    await open()
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '2.5' } })
    await userEvent.type(screen.getByLabelText('Name for this pin (optional)'), 'Trailhead')
    await userEvent.click(screen.getByRole('button', { name: 'Use these coordinates' }))
    expect(changes[0]).toEqual({ name: 'Trailhead', point: { lat: 1.5, lng: 2.5 } })
  })
})

describe('LocationPicker: choosing on the map', () => {
  const openMap = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Choose on map' }))
    return screen.findByRole('dialog', { name: 'Choose on map' })
  }
  const ready = (fake: ReturnType<typeof createFakeMap>) => waitFor(() => expect(fake.state.options?.onPointPick).toBeDefined())

  it('opens centred on the trip, with no pin and nothing to confirm yet', async () => {
    const { fake } = setup()
    const dialog = await openMap()
    await ready(fake)
    expect(fake.state.options?.center).toEqual(near)
    expect(fake.state.picked).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Use this location' })).toBeDisabled()
  })

  it('a tap drops a pin, looks up its name, lets the name be changed, and confirms', async () => {
    const { fake, geocoding, changes } = setup()
    const dialog = await openMap()
    await ready(fake)
    const spot = { lat: -8.51, lng: 115.26 }
    act(() => fake.pick(spot))
    await waitFor(() => expect(fake.state.picked).toEqual(spot))
    const name = await within(dialog).findByLabelText('Place name')
    await waitFor(() => expect(name).toHaveValue('Warung Sari'))
    expect(geocoding.reverse).toHaveBeenCalledWith(spot, expect.any(AbortSignal))
    expect(within(dialog).getByText('Ubud, Bali')).toBeInTheDocument()
    expect(within(dialog).getByText('-8.51000, 115.26000')).toBeInTheDocument()
    await userEvent.clear(name)
    await userEvent.type(name, 'Sunset warung')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this location' }))
    expect(changes).toEqual([{ name: 'Sunset warung', address: 'Ubud, Bali', point: spot }])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Choose on map' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('group', { name: 'Chosen location' })).toHaveFocus())
  })

  it('moving the pin looks up the new spot and drops the lookup for the old one', async () => {
    const reverse = vi.fn(async (point) => ({ id: 'r', name: `At ${point.lat}`, point }))
    const { fake } = setup({ geocoding: stubGeocoder({ reverse }) })
    const dialog = await openMap()
    await ready(fake)
    act(() => fake.pick({ lat: 1, lng: 1 }))
    act(() => fake.pick({ lat: 2, lng: 2 })) // dragged on before the first lookup was sent
    await waitFor(() => expect(within(dialog).getByLabelText('Place name')).toHaveValue('At 2'))
    expect(reverse).toHaveBeenCalledTimes(1)
  })

  it('when the lookup fails it says so, keeps the pin, and the typed name is used', async () => {
    const { fake, changes } = setup({ geocoding: stubGeocoder({ reverse: vi.fn().mockRejectedValue(new Error('503')) }) })
    const dialog = await openMap()
    await ready(fake)
    act(() => fake.pick({ lat: -8.6, lng: 115.1 }))
    expect(await within(dialog).findByText('Couldn’t look up the name. Type one below.')).toBeInTheDocument()
    expect(fake.state.picked).toEqual({ lat: -8.6, lng: 115.1 })
    await userEvent.type(within(dialog).getByLabelText('Place name'), 'Quiet cove')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this location' }))
    expect(changes).toEqual([{ name: 'Quiet cove', address: undefined, point: { lat: -8.6, lng: 115.1 } }])
  })

  it('falls back to the activity name when the spot has none and nothing is typed', async () => {
    const { fake, changes } = setup({ geocoding: stubGeocoder({ reverse: vi.fn(async () => undefined) }) })
    const dialog = await openMap()
    await ready(fake)
    act(() => fake.pick({ lat: 0.5, lng: 0.5 }))
    expect(await within(dialog).findByText('No name found at this spot. Type one below.')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this location' }))
    expect(changes[0]?.name).toBe('Beach picnic')
  })

  it('has a keyboard route: Pin the map centre takes the middle of the map', async () => {
    const { fake } = setup()
    const dialog = await openMap()
    await ready(fake)
    const button = await within(dialog).findByRole('button', { name: 'Pin the map centre' })
    await waitFor(() => expect(button).toBeEnabled())
    fake.setCenter({ lat: -8.7, lng: 115.1 })
    await userEvent.click(button)
    await waitFor(() => expect(fake.state.picked).toEqual({ lat: -8.7, lng: 115.1 }))
    expect(await within(dialog).findByLabelText('Place name')).toBeInTheDocument()
  })

  it('Adjust on map opens on the chosen place with its pin, and Cancel changes nothing', async () => {
    const { fake, changes } = setup({ initial: { name: 'Petitenget Beach', address: 'Seminyak', point: petitenget.point } })
    await userEvent.click(screen.getByRole('button', { name: 'Adjust on map' }))
    const dialog = await screen.findByRole('dialog', { name: 'Choose on map' })
    await waitFor(() => expect(fake.state.picked).toEqual(petitenget.point))
    expect(fake.state.options?.center).toEqual(petitenget.point)
    expect(within(dialog).getByLabelText('Place name')).toHaveValue('Petitenget Beach')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(changes).toEqual([])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('group', { name: 'Chosen location' })).toHaveTextContent('Petitenget Beach')
  })
})
