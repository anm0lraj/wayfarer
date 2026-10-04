import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { processMemoryUploads } from '@/data/uploadQueue'
import { installMockApi } from '@/mocks/install'
import { defaultServices, type Services } from '@/services'
import { useClockStore } from '@/services/clock/clock'
import { renderApp } from '@/test/renderApp'
import { useAIPanel } from './ai/panelStore'
import { useTripDraft } from './trips/create/draftStore'

const DAY2_MIDMORNING = '2026-10-13T10:30:00+08:00' // Uluwatu Temple (10:00–12:00) is running
const setOnline = (on: boolean) => Object.defineProperty(navigator, 'onLine', { value: on, configurable: true })
const photo = () => new File([new Uint8Array([1, 2, 3, 4])], 'sunset.jpg', { type: 'image/jpeg' })

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  setOnline(true)
  useClockStore.setState({ simulatedNow: null })
  useTripDraft.getState().clear()
  useAIPanel.setState({ open: false, width: 400 })
  await resetDemoData()
})
afterEach(() => {
  setOnline(true)
  vi.restoreAllMocks()
})

describe('Memories timeline', () => {
  it('groups memories by day, with the activity each was attached to', async () => {
    renderApp('/trips/trip-goa/memories')
    expect(await screen.findByRole('heading', { name: 'Day 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Day 2' })).toBeInTheDocument()
    expect(screen.getByText('Sunset at Baga Beach')).toBeInTheDocument()
    expect(screen.getAllByText(/· Fort Aguada/).length).toBeGreaterThan(0)
    expect(screen.getByText('4 memories')).toBeInTheDocument()
  })

  it('shows an empty state with a way forward', async () => {
    renderApp('/trips/trip-bali/memories')
    expect(await screen.findByText('No memories yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add your first memory' })).toHaveAttribute('href', '/trips/trip-bali/memories/new')
  })

  it('deletes a memory and brings it back with Undo', async () => {
    renderApp('/trips/trip-goa/memories')
    await userEvent.click(await screen.findByRole('button', { name: 'Options for Sunset at Baga Beach' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await waitFor(async () => expect(await db.memories.get('mem-goa-1')).toBeUndefined())
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(async () => expect(await db.memories.get('mem-goa-1')).toBeDefined())
  })
})

describe('Add memory', () => {
  it('files a note under the day and activity it happened during', async () => {
    useClockStore.setState({ simulatedNow: DAY2_MIDMORNING })
    const router = renderApp('/trips/trip-bali/memories/new')
    await userEvent.click(await screen.findByRole('button', { name: /Note/ }))
    await userEvent.type(screen.getByLabelText('Your note'), 'The monkeys stole a hat')
    expect(await screen.findByRole('option', { name: 'Automatic — Uluwatu Temple' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips/trip-bali/memories'))
    const saved = (await db.memories.where('tripId').equals('trip-bali').toArray())[0]!
    expect(saved).toMatchObject({ kind: 'text', text: 'The monkeys stole a hat', dayId: 'day-2', itemId: 'item-d2-2', uploadState: 'done' })
    expect(await screen.findByRole('heading', { name: /Day 2/ })).toBeInTheDocument()
  })

  it('saves a photo on the device first and uploads it in the background', async () => {
    useClockStore.setState({ simulatedNow: DAY2_MIDMORNING })
    renderApp('/trips/trip-bali/memories/new')
    await userEvent.upload(await screen.findByLabelText('Choose a photo'), photo())
    await userEvent.type(screen.getByLabelText('Caption (optional)'), 'Sunset at Seminyak Beach')
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    await waitFor(async () => expect(await db.memories.count()).toBe(5)) // 4 seeded Goa + this one
    const saved = (await db.memories.where('tripId').equals('trip-bali').toArray())[0]!
    expect(saved.mediaKey).toBeTruthy()
    expect(await db.blobs.get(saved.mediaKey!)).toBeTruthy()
    await waitFor(async () => expect((await db.memories.get(saved.id))?.uploadState).toBe('done'))
  })

  it('keeps an offline photo queued, then uploads it when back online', async () => {
    setOnline(false)
    renderApp('/trips/trip-bali/memories/new')
    await userEvent.upload(await screen.findByLabelText('Choose a photo'), photo())
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    expect(await screen.findByText('Waiting to upload')).toBeInTheDocument()
    expect(screen.getByText(/waiting to upload — they’ll send when you’re back online/)).toBeInTheDocument()
    const [m] = await db.memories.where('tripId').equals('trip-bali').toArray()
    expect(m!.uploadState).toBe('queued')

    setOnline(true)
    window.dispatchEvent(new Event('online'))
    await waitFor(async () => expect((await db.memories.get(m!.id))?.uploadState).toBe('done'))
    await waitFor(() => expect(screen.queryByText('Waiting to upload')).not.toBeInTheDocument())
  })

  it('marks a failed upload and lets you retry', async () => {
    renderApp('/trips/trip-bali/memories/new')
    await userEvent.upload(await screen.findByLabelText('Choose a photo'), photo())
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    // The memory is written a moment after the click (more slowly on a busy machine), so wait for it instead of assuming it is there.
    const m = await waitFor(async () => {
      const [saved] = await db.memories.where('tripId').equals('trip-bali').toArray()
      expect(saved).toBeDefined()
      return saved!
    })
    await waitFor(async () => expect((await db.memories.get(m.id))?.uploadState).toBe('done'))

    await db.memories.update(m.id, { uploadState: 'queued' })
    const failing = { ...defaultServices.storage, publish: () => Promise.reject(new Error('network')) }
    expect(await processMemoryUploads(failing)).toEqual({ uploaded: 0, failed: 1 })
    expect((await db.memories.get(m.id))?.uploadState).toBe('failed')
    // automatic runs leave failed items alone; the Retry button includes them
    expect(await processMemoryUploads(defaultServices.storage)).toEqual({ uploaded: 0, failed: 0 })
    expect(await processMemoryUploads(defaultServices.storage, { retryFailed: true })).toEqual({ uploaded: 1, failed: 0 })
  })

  it('validates before saving', async () => {
    renderApp('/trips/trip-bali/memories/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Save memory' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose or take a photo first.')
    expect(await db.memories.where('tripId').equals('trip-bali').count()).toBe(0)
  })

  it('says so when the browser can’t record audio', async () => {
    renderApp('/trips/trip-bali/memories/new')
    await userEvent.click(await screen.findByRole('button', { name: /Voice note/ }))
    expect(await screen.findByText(/can’t record audio/)).toBeInTheDocument()
  })

  it('does not ask for location until you press the button, and copes with a refusal', async () => {
    const getPosition = vi.fn(() => Promise.reject({ code: 1 }))
    const geolocation: Services['geolocation'] = { isSupported: () => true, permission: async () => 'prompt', getPosition, watch: () => () => {} }
    renderApp('/trips/trip-bali/memories/new', { geolocation })
    await userEvent.click(await screen.findByRole('button', { name: /Place/ }))
    expect(getPosition).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Use my current location' }))
    expect(await screen.findByText(/Location is blocked/)).toBeInTheDocument()
  })

  it('remembers a location and lets you hide it from public pages (on by default)', async () => {
    const geolocation: Services['geolocation'] = { isSupported: () => true, permission: async () => 'granted', getPosition: async () => ({ lat: -8.69, lng: 115.16 }), watch: () => () => {} }
    renderApp('/trips/trip-bali/memories/new', { geolocation })
    await userEvent.click(await screen.findByRole('button', { name: /Place/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Use my current location' }))
    expect(await screen.findByRole('checkbox', { name: /Hide this location/ })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Save memory' }))
    await waitFor(async () => expect((await db.memories.where('tripId').equals('trip-bali').toArray())[0]).toMatchObject({ kind: 'location', point: { lat: -8.69, lng: 115.16 }, stripLocationOnPublic: true }))
  })
})

describe('Stories', () => {
  it('builds a story from memories and saves it', async () => {
    const router = renderApp('/trips/trip-goa/stories/new')
    await userEvent.type(await screen.findByLabelText('Title'), 'Goa in two')
    await userEvent.click(await screen.findByRole('button', { name: /Sunset at Baga Beach/ }))
    await userEvent.click(screen.getByRole('button', { name: /Fish thali at the shack/ }))
    expect(screen.getByRole('heading', { name: 'Slides (2)' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Text on slide 1'), 'Golden hour')
    await userEvent.click(screen.getByRole('button', { name: 'Sticker 🌅 for slide 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Move slide 1 down' }))
    await userEvent.click(screen.getByRole('radio', { name: /Friends only/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save story' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/trip-goa\/stories\/story_/))
    const saved = (await db.stories.toArray()).find((s) => s.title === 'Goa in two')!
    expect(saved.visibility).toBe('friends')
    expect(saved.slides.map((s) => s.memoryId)).toEqual(['mem-goa-2', 'mem-goa-1']) // reordered
    expect(saved.slides[1]).toMatchObject({ text: 'Golden hour', sticker: '🌅' })
  })

  it('needs a title and a slide', async () => {
    renderApp('/trips/trip-goa/stories/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Save story' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Give your story a title.')
    await userEvent.type(screen.getByLabelText('Title'), 'Empty')
    await userEvent.click(screen.getByRole('button', { name: 'Save story' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one slide.')
  })

  it('plays a story: arrow keys move through it, Escape closes it', async () => {
    renderApp('/trips/trip-goa/stories/story-goa-1')
    const viewer = await screen.findByRole('dialog', { name: 'Story: Day 1 — Goa' })
    expect(within(viewer).getByText('We made it.')).toBeInTheDocument()
    expect(within(viewer).getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Slide 1 of 2')
    await userEvent.keyboard('{ArrowRight}')
    expect(await within(viewer).findByText('Best fish thali. Ever.')).toBeInTheDocument()
    expect(within(viewer).getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Slide 2 of 2')
    await userEvent.keyboard('{ArrowLeft}')
    expect(await within(viewer).findByText('We made it.')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Story:/ })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Watch/ })).toBeInTheDocument()
  })

  it('shows a clear message for a story that does not exist', async () => {
    renderApp('/trips/trip-goa/stories/nope')
    expect(await screen.findByText('Story not found')).toBeInTheDocument()
  })
})

describe('Journey links', () => {
  it('Live Trip offers Add memory pre-filled with the current activity', async () => {
    useClockStore.setState({ simulatedNow: DAY2_MIDMORNING })
    renderApp('/trips/trip-bali/live')
    const link = await screen.findByRole('link', { name: /Add memory/ })
    expect(link).toHaveAttribute('href', '/trips/trip-bali/memories/new?item=item-d2-2')
  })
})
