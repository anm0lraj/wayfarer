import { describe, expect, it } from 'vitest'
import { placeholderImage } from './placeholder'
import { buildSeed } from '@/data/seedData'

const svg = (url: string) => decodeURIComponent(url.replace('data:image/svg+xml;utf8,', ''))

describe('generated illustrations', () => {
  it('are deterministic and differ per place', () => {
    expect(placeholderImage('p-seminyak-beach')).toBe(placeholderImage('p-seminyak-beach'))
    expect(placeholderImage('p-seminyak-beach')).not.toBe(placeholderImage('p-sanur-beach'))
  })

  it('pick a scene that suits the kind of place', () => {
    expect(svg(placeholderImage('r-warung-sari'))).toContain('<circle') // a plate
    expect(svg(placeholderImage('h-coral-resort1'))).toContain('rx=') // a pool
    expect(svg(placeholderImage('p-tegallalang'))).not.toBe(svg(placeholderImage('p-uluwatu-temple')))
  })

  it('give any new place an image with no asset to source', () => {
    expect(placeholderImage('p-some-new-place-nobody-listed')).toMatch(/^data:image\/svg\+xml/)
  })

  it('cover every image in the seed data, with nothing fetched from another site', () => {
    const s = buildSeed()
    const urls = [
      ...s.destinations.map((d) => d.heroImage),
      ...s.places.flatMap((p) => p.images),
      ...s.hotels.flatMap((h) => h.images),
      ...s.trips.map((t) => t.coverImage ?? ''),
      ...s.publicTrips.map((p) => p.coverImage),
    ]
    expect(urls.length).toBeGreaterThan(40)
    for (const u of urls) expect(u.startsWith('data:image/svg+xml'), u.slice(0, 60)).toBe(true)
  })
})
