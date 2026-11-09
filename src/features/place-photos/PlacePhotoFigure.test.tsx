import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import { db } from '@/data/db'
import { itineraryRepo } from '@/data/repositories'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { renderApp } from '@/test/renderApp'
import { settle } from '@/test/settle'
import { resetAutoPhotoFailures } from './autoPhotos'

const credit = {
  name: 'Ana Photographer', profileUrl: 'https://unsplash.com/@ana?utm_source=travel_planner_app&utm_medium=referral', provider: 'Unsplash',
  providerUrl: 'https://unsplash.com/?utm_source=travel_planner_app&utm_medium=referral', photoUrl: 'https://unsplash.com/photos/1?utm_source=travel_planner_app&utm_medium=referral',
}

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  setActorId(DEMO_USER_ID)
  await resetDemoData()
  resetAutoPhotoFailures()
})
afterEach(async () => { await settle() })

describe('photos in activity details', () => {
  it('show a found photo with “Photo by … on Unsplash”, both linked with the referral parameters', async () => {
    const item = await itineraryRepo.addItem('trip-bali', 'day-1', {
      title: 'Coffee', startTime: '16:00', durationMin: 45, category: 'food', customLocation: { name: 'Revolver Espresso', point: { lat: -8.68, lng: 115.16 } },
      autoPhoto: { query: 'Revolver Espresso, Bali', photo: { url: 'https://images.unsplash.com/photo-1?ixid=a&w=1280&fm=webp&q=60', width: 1280, height: 853, alt: 'A cafe counter', credit } },
    })
    renderApp(`/trips/trip-bali/itinerary/items/${item.id}`)
    const dialog = await screen.findByRole('dialog', { name: 'Coffee' })
    const img = within(dialog).getByRole('img', { name: 'A cafe counter' })
    expect(img.getAttribute('srcset')).toContain('w=640')
    expect(within(dialog).getByText(/Photo by/).textContent).toBe('Photo by Ana Photographer on Unsplash')
    expect(within(dialog).getByRole('link', { name: 'Ana Photographer' })).toHaveAttribute('href', credit.profileUrl)
    expect(within(dialog).getByRole('link', { name: 'Unsplash' })).toHaveAttribute('href', credit.providerUrl)
    // If the image can't load (offline before it was cached), the illustration takes its place and the credit goes.
    fireEvent.error(img)
    await waitFor(() => expect(within(dialog).queryByText(/Photo by/)).not.toBeInTheDocument())
    expect(dialog.querySelector('img')!.getAttribute('src')).toMatch(/^data:image\/svg/)
  })

  it('show a catalogue stop’s photo with its Commons credit', async () => {
    renderApp('/trips/trip-bali/itinerary/items/item-d2-5')
    const dialog = await screen.findByRole('dialog', { name: 'Kecak fire dance at Uluwatu' })
    expect(await within(dialog).findByRole('link', { name: 'Wikimedia Commons' })).toHaveAttribute('href', 'https://commons.wikimedia.org/')
  })

  it('a custom stop added in the app gets its photo in the background (demo adapter)', async () => {
    const item = await itineraryRepo.addItem('trip-bali', 'day-1', {
      title: 'Rice terraces', startTime: '16:00', durationMin: 60, category: 'sightseeing', customLocation: { name: 'Tegallalang Rice Terrace', point: { lat: -8.43, lng: 115.28 } },
    })
    renderApp('/trips/trip-bali/itinerary/day/1')
    await waitFor(async () => expect((await db.items.get(item.id))!.autoPhoto?.photo?.url).toBe('/photos/p-tegallalang-1280.webp'))
  })
})
