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

  it('draw the right scene for every kind of seeded place', () => {
    const s = buildSeed()
    for (const p of s.places) {
      const scene = sceneFor(p.id)
      if (p.kind === 'restaurant') expect(scene, p.id).toBe('food')
      if (/temple/.test(p.id)) expect(scene, p.id).toBe('temple')
      if (/beach/.test(p.id)) expect(scene, p.id).toBe('coast')
    }
    for (const id of ['jaipur', 'udaipur', 'delhi']) expect(sceneFor(id)).toBe('fort')
    for (const id of ['p-tegallalang', 'p-sidemen']) expect(sceneFor(id)).toBe('terraces')
    expect(sceneFor('paris')).toBe('city')
    expect(sceneFor('h-kayu-homestay1')).toBe('hotel')
  })

  it('show the right landmark for known places', () => {
    expect(svg(placeholderImage('jodhpur'))).toMatch(/#2f6bff|#5a95ff|#8fb8ff|#3d7fe6/) // blue houses below the fort
    expect(svg(placeholderImage('paris'))).toContain('#9a5a34') // an iron lattice tower
    expect(svg(placeholderImage('g-fort-aguada'))).toContain('#ff4b3a') // a striped lighthouse
    expect(svg(placeholderImage('goa-3:Fish thali at the shack'))).toContain('#c9d2df') // steel bowls of a thali
  })

  it('stay bright: daytime skies and no near-black fills', () => {
    const s = buildSeed()
    const urls = [...s.destinations.map((d) => d.heroImage), ...s.places.flatMap((p) => p.images), ...s.hotels.flatMap((h) => h.images)]
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    for (const u of urls) {
      const fills = [...svg(u).matchAll(/(?:fill|stop-color)="(#[0-9a-f]{6})"/g)].map((m) => m[1]!)
      // Deep colours are small details (thatch, nori, a shadow), never black silhouettes.
      expect(Math.min(...fills.map(lum)), u.slice(0, 80)).toBeGreaterThan(0.08)
    }
    const golden = s.places.filter((p) => svg(p.images[0]!).includes('#ff6a2b')).length
    expect(golden).toBeLessThan(s.places.length / 3) // golden hour is the exception, not the rule
  })

  it('are valid, self-contained SVG with unique ids', () => {
    const s = buildSeed()
    for (const u of [...s.places.flatMap((p) => p.images), ...s.hotels.flatMap((h) => h.images), ...s.publicTrips.map((p) => p.coverImage)]) {
      const text = svg(u)
      expect(new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('parsererror'), u.slice(0, 80)).toBeNull()
      expect(text).not.toMatch(/href=|url\(http/)
      // A hotel room draws a small sky in its window as a nested <svg>, which may reuse the outer ids inside it.
      if (text.includes('<svg x=')) continue
      const ids = [...text.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
      expect(new Set(ids).size, u.slice(0, 80)).toBe(ids.length)
    }
  })

  it('give any new place an image with no asset to source', () => {
    expect(placeholderImage('p-some-new-place-nobody-listed')).toMatch(/^data:image\/svg\+xml/)
  })

  it('stand in for every seed image without a stock photo, with nothing fetched from another site', () => {
    const s = buildSeed()
    const urls = [
      ...s.destinations.map((d) => d.heroImage),
      ...s.places.flatMap((p) => p.images),
      ...s.hotels.flatMap((h) => h.images),
      ...s.trips.map((t) => t.coverImage ?? ''),
      ...s.publicTrips.map((p) => p.coverImage),
    ]
    expect(urls.length).toBeGreaterThan(40)
    // Either a self-hosted stock photo (src/lib/photos) or an illustration drawn here.
    for (const u of urls) expect(u.startsWith('data:image/svg+xml') || /^\/photos\/[a-z0-9-]+-1280\.webp$/.test(u), u.slice(0, 60)).toBe(true)
  })
})
