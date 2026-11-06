import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageCard } from '@/components/ui/ImageCard'
import { fetchPriority } from './fetchPriority'

afterEach(() => vi.restoreAllMocks())

describe('fetchPriority', () => {
  // First in the file: React warns about an unknown prop only once per page load.
  it('passes the hint on a card image without React complaining', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { container } = render(<ImageCard src="/a.jpg" alt="" title="Bali" priority />)
    expect(container.querySelector('img')).toHaveAttribute('fetchpriority', 'high')
    expect(error).not.toHaveBeenCalled()
  })

  it('sets the attribute, and removes it when the hint goes', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const Img = ({ p }: { p?: 'high' | 'low' }) => <img src="/a.jpg" alt="" {...fetchPriority(p)} />
    const { container, rerender } = render(<Img p="high" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('fetchpriority', 'high')
    rerender(<Img p="low" />)
    expect(img).toHaveAttribute('fetchpriority', 'low')
    rerender(<Img />)
    expect(img).not.toHaveAttribute('fetchpriority')
    expect(error).not.toHaveBeenCalled()
  })
})
