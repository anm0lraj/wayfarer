import { describe, expect, it } from 'vitest'
import { placeholderImage, sceneFor } from './placeholder'
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

  it('match the scene to the place', () => {
    expect(sceneFor('delhi')).toBe('fort')
    expect(sceneFor('jodhpur')).toBe('fort')
    expect(sceneFor('j-fushimi')).toBe('shrine')
    expect(sceneFor('manali')).toBe('mountains')
    expect(sceneFor('g-fort-aguada')).toBe('coast') // a sea fort with a lighthouse, not a Rajput palace
    expect(sceneFor('goa-3:Fish thali at the shack')).toBe('food') // seeded memories pass their caption
    expect(sceneFor('goa-1:Painted houses, Fontainhas')).toBe('city')
  })

  // Shapes only: colours and coordinates removed, so two images that differ only in palette count as the same.
  const shape = (url: string) => svg(url).replace(/#[0-9a-f]{6}/g, '').replace(/-?[\d.]+/g, '')

  it('draw each seeded hotel as a different kind of building', () => {
    const covers = buildSeed().hotels.map((h) => shape(h.images[0]!))
    expect(covers.length).toBe(4)
    expect(new Set(covers).size).toBe(4)
  })

  it('make neighbouring cards in the itinerary feed look different', () => {
    const feed = [...buildSeed().publicTrips].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) // the feed's order
    const covers = feed.map((t) => shape(t.coverImage))
    for (let i = 1; i < covers.length; i++) expect(covers[i], `cards ${i - 1} and ${i}`).not.toBe(covers[i - 1])
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
