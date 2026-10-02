import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentMeta } from './useDocumentMeta'

const meta = (k: string) => document.head.querySelector(`meta[property="${k}"], meta[name="${k}"]`)?.getAttribute('content')

describe('useDocumentMeta', () => {
  it('sets Open Graph tags and title, and restores them on unmount', () => {
    document.title = 'Wayfarer'
    const { unmount } = renderHook(() => useDocumentMeta({ title: '5 Days in Bali', description: 'Sunsets and temples', image: 'https://img/x.jpg', path: '/t/bali-ab12' }))
    expect(document.title).toBe('5 Days in Bali · Wayfarer')
    expect(meta('og:title')).toBe('5 Days in Bali')
    expect(meta('og:description')).toBe('Sunsets and temples')
    expect(meta('og:image')).toBe('https://img/x.jpg')
    expect(meta('og:url')).toMatch(/\/t\/bali-ab12$/)
    expect(meta('twitter:card')).toBe('summary_large_image')
    unmount()
    expect(document.title).toBe('Wayfarer')
    expect(meta('og:title')).toBeUndefined()
  })
})
