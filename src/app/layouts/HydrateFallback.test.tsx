import { screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoData } from '@/data/seed'
import { installMockApi } from '@/mocks/install'
import { renderApp } from '@/test/renderApp'

beforeAll(() => installMockApi())
beforeEach(async () => { localStorage.clear(); await resetDemoData() })
afterEach(() => vi.restoreAllMocks())

describe('first load of a lazily loaded page', () => {
  it('does not make React Router complain that it has nothing to show meanwhile', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderApp('/privacy')
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument()
    expect(warn.mock.calls.flat().join(' ')).not.toContain('HydrateFallback')
  })
})
