import { screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { renderApp } from '@/test/renderApp'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  localStorage.setItem('demo-signed-out', '1') // both pages are readable without signing in
  await resetDemoData()
})

describe('privacy notice', () => {
  it('is readable signed out and names who handles the data and what it is used for', async () => {
    renderApp('/privacy')
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    // The things a person would want to know before using the app (keep these true when the app changes).
    for (const fact of ['Google Firebase', 'Mumbai', 'Vercel', 'Gemini', 'OpenStreetMap', 'Nominatim', 'Open-Meteo', 'Unsplash', 'Download your data', 'Delete your account', 'Feedback', 'aged 18']) {
      expect(text, fact).toContain(fact)
    }
    expect(text).toMatch(/Last updated \d{1,2} \w+ \d{4}/)
  })

  it('says what place searches send to the geocoder', async () => {
    renderApp('/privacy')
    await screen.findByRole('heading', { name: 'Maps, weather and routes' })
    expect(document.body.textContent).toMatch(/text you type and the approximate area of your trip are sent to OpenStreetMap’s Nominatim geocoder/)
    expect(document.body.textContent).toMatch(/never ask for your device’s location here/)
  })

  it('says what photo searches send to Unsplash and that browsers load the photos from it', async () => {
    renderApp('/privacy')
    await screen.findByRole('heading', { name: 'Maps, weather and routes' })
    expect(document.body.textContent).toMatch(/place’s name and the trip’s destination are sent to Unsplash through our server/)
    expect(document.body.textContent).toMatch(/loaded by your browser, and by the browser of anyone viewing a page you publish, from Unsplash’s image servers/)
  })

  it('says what the assistant is sent and that notes are not', async () => {
    renderApp('/privacy')
    await screen.findByRole('heading', { name: 'The travel assistant' })
    expect(document.body.textContent).toMatch(/do not send your private notes/)
    expect(document.body.textContent).toMatch(/sensitive personal information/)
  })

  it('points to Settings for requests when no contact address is configured, and links to the terms', async () => {
    renderApp('/privacy')
    await screen.findByRole('heading', { level: 1, name: 'Privacy notice' })
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(screen.getByRole('link', { name: 'terms of use' })).toHaveAttribute('href', '/terms')
  })
})

describe('terms of use', () => {
  it('is readable signed out and is clear that nothing here is a real booking', async () => {
    renderApp('/terms')
    expect(await screen.findByRole('heading', { level: 1, name: 'Terms of use' })).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/does not book flights, hotels or activities/)
    expect(document.body.textContent).toMatch(/not a reservation/)
  })
})

describe('where people find them', () => {
  it('the sign-in screen asks people to agree to both, and every public page links to both', async () => {
    renderApp('/signin')
    await screen.findByRole('heading', { level: 1, name: 'Welcome to Wayfarer' })
    const links = screen.getAllByRole('link')
    for (const href of ['/terms', '/privacy']) expect(links.filter((l) => l.getAttribute('href') === href).length, href).toBeGreaterThanOrEqual(2) // in the sentence and in the footer
  })
})

describe('photo credits', () => {
  it('explain that photos of the traveller’s own places come from Unsplash and are credited where shown', async () => {
    renderApp('/credits')
    expect(await screen.findByRole('heading', { name: 'Photos of your own places' })).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/credited to its photographer wherever it appears/)
    expect(screen.getByRole('link', { name: 'Unsplash License' })).toHaveAttribute('href', 'https://unsplash.com/license')
  })
})
