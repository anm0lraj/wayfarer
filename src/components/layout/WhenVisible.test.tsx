import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WhenVisible } from './WhenVisible'

afterEach(() => vi.unstubAllGlobals())

describe('WhenVisible', () => {
  it('renders at once where the browser cannot tell what is on screen', () => {
    render(<WhenVisible fallback={<p>holding</p>}><p>the map</p></WhenVisible>)
    expect(screen.getByText('the map')).toBeInTheDocument()
  })

  it('holds the space until the spot nears the screen, then renders and stops watching', () => {
    let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => undefined
    const disconnect = vi.fn()
    const observe = vi.fn()
    vi.stubGlobal('IntersectionObserver', class { constructor(cb: typeof notify, public options: unknown) { notify = cb; observers.push(options) } observe = observe; disconnect = disconnect })
    const observers: unknown[] = []

    render(<WhenVisible fallback={<p>holding</p>} margin="120px"><p>the map</p></WhenVisible>)
    expect(screen.getByText('holding')).toBeInTheDocument()
    expect(screen.queryByText('the map')).toBeNull()
    expect(observers[0]).toEqual({ rootMargin: '120px' })

    act(() => notify([{ isIntersecting: false }]))
    expect(screen.queryByText('the map')).toBeNull()

    act(() => notify([{ isIntersecting: true }]))
    expect(screen.getByText('the map')).toBeInTheDocument()
    expect(disconnect).toHaveBeenCalled()
  })
})
