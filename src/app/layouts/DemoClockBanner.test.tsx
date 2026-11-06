import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { wallClockLabel } from '@/lib/dates'
import { useClockStore } from '@/services/clock/clock'
import { DemoClockBanner } from './DemoClockBanner'

const realTz = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'Asia/Kolkata' // a browser somewhere other than the trip (Bali is UTC+8)
  useClockStore.setState({ simulatedNow: null })
})
afterEach(() => {
  if (realTz === undefined) delete process.env.TZ
  else process.env.TZ = realTz
})

describe('DemoClockBanner', () => {
  it('shows the simulated time as it was set, named by its offset, not in the browser’s timezone', () => {
    useClockStore.setState({ simulatedNow: '2026-10-13T10:00:00+08:00' })
    render(<DemoClockBanner />)
    expect(screen.getByRole('status')).toHaveTextContent('Demo date: 13 Oct 2026, 10:00 (UTC+08:00)')
  })

  it('is hidden on real time and goes back to it', async () => {
    const { container, rerender } = render(<DemoClockBanner />)
    expect(container).toBeEmptyDOMElement()
    useClockStore.setState({ simulatedNow: '2026-10-05T09:00:00+08:00' })
    rerender(<DemoClockBanner />)
    await userEvent.click(screen.getByRole('button', { name: 'Back to today' }))
    expect(useClockStore.getState().simulatedNow).toBeNull()
  })
})

describe('wallClockLabel', () => {
  it('keeps the wall clock and names the offset', () => {
    expect(wallClockLabel('2026-10-13T10:00:00+08:00')).toBe('13 Oct 2026, 10:00 (UTC+08:00)')
    expect(wallClockLabel('2026-03-01T23:45:00.000-0430')).toBe('1 Mar 2026, 23:45 (UTC-04:30)')
    expect(wallClockLabel('2026-10-12T00:30:00Z')).toBe('12 Oct 2026, 00:30 (UTC+00:00)')
    expect(wallClockLabel('2026-10-12T08:30')).toBe('12 Oct 2026, 08:30')
    expect(wallClockLabel('not a date')).toBe('not a date')
  })
})
