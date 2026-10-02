import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from './router'
import { Bootstrap } from './providers/Bootstrap'
import { ServicesProvider } from '@/services'
import { resetDemoData } from '@/data/seed'
import { useClockStore } from '@/services/clock/clock'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ServicesProvider><Bootstrap><RouterProvider router={router} /></Bootstrap></ServicesProvider>
    </QueryClientProvider>,
  )
  return router
}

beforeEach(async () => {
  localStorage.clear()
  useClockStore.setState({ simulatedNow: null })
  await resetDemoData()
})

describe('app shell', () => {
  it('shows the five primary destinations and the seeded trips on Home', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Anmol/ })).toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Primary' })[0]!
    for (const label of ['Home', 'Trips', 'Explore', 'AI', 'Profile']) expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    expect(await screen.findByText('5 Days in Bali')).toBeInTheDocument()
  })

  it('offers Profile once, in the navigation, not also in the header', async () => {
    renderAt('/')
    await screen.findByText('5 Days in Bali')
    expect(screen.getAllByRole('link', { name: /Profile/ })).toHaveLength(3) // one per nav pattern (bottom, rail, sidebar); none in the header
    expect(screen.queryByRole('link', { name: /Profile: / })).not.toBeInTheDocument()
  })

  it('adds a Live nav entry only while a trip is active (demo clock)', async () => {
    renderAt('/')
    await screen.findByText('5 Days in Bali')
    expect(screen.queryByRole('link', { name: /^Live/ })).not.toBeInTheDocument()
    useClockStore.setState({ simulatedNow: '2026-10-13T10:00:00+08:00' })
    expect((await screen.findAllByRole('link', { name: /^Live/ })).length).toBeGreaterThan(0)
    expect(screen.getByText(/Demo date/)).toBeInTheDocument()
  })

  it('renders the trip workspace with URL-reflected tabs', async () => {
    const router = renderAt('/trips/trip-bali')
    expect(await screen.findByRole('heading', { name: '5 Days in Bali', level: 1 })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Itinerary' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips/trip-bali/itinerary/day/1')) // after the index redirect
    expect(await screen.findByRole('heading', { name: 'Day 1 · Arrival & Seminyak' })).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown trip and for unknown URLs', async () => {
    renderAt('/trips/nope')
    expect(await screen.findByText('Couldn’t load this trip').catch(() => screen.findByText('Trip not found'))).toBeInTheDocument()
  })

  it('renders 404 for unknown routes', async () => {
    renderAt('/definitely/not/a/route')
    expect(await screen.findByText('We can’t find that page')).toBeInTheDocument()
  })
})

describe('ResponsiveSheet', () => {
  function Demo() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <ResponsiveSheet open={open} onOpenChange={setOpen} title="Add activity"><p>Body</p></ResponsiveSheet>
      </>
    )
  }
  it('opens as a labelled dialog, closes on Escape and returns focus to the trigger', async () => {
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    render(<Demo />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Add activity' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus()) // Radix restores focus on the next tick
  })
})
