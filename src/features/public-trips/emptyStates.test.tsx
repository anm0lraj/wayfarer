import { screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/data/db'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { renderApp } from '@/test/renderApp'

beforeAll(() => installMockApi())
beforeEach(async () => {
  localStorage.clear()
  await resetDemoData()
  await db.publicTrips.clear() // a new project: nobody has published anything yet
})

describe('when nothing has been shared yet', () => {
  it('Home says so under Inspiration instead of leaving a blank row', async () => {
    renderApp('/')
    expect(await screen.findByText('No shared itineraries yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Your trips' })).toHaveAttribute('href', '/trips')
  })

  it('the full feed explains it, without a pointless "Clear filters" button', async () => {
    renderApp('/explore/itineraries')
    expect(await screen.findByText('Nothing shared yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Your trips' })).toBeInTheDocument()
  })

  it('a search with no results still offers to clear it', async () => {
    renderApp('/explore/itineraries?q=zzzz')
    expect(await screen.findByText('No itineraries match')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })
})
