import { describe, expect, it } from 'vitest'
import { buildSeed } from '@/data/seedData'
import { installImageFallback } from './fallback'
import { allPhotos, photoUrl, STOCK_HOST, thumbUrl } from './index'

const isStock = (url: string) => url.startsWith(`https://${STOCK_HOST}/wikipedia/commons/thumb/`)

describe('every card image is a real photograph', () => {
  const s = buildSeed()
  it('destinations', () => { for (const d of s.destinations) expect(isStock(d.heroImage), `${d.id}: ${d.heroImage.slice(0, 40)}`).toBe(true) })
  it('places and restaurants', () => { for (const p of s.places) expect(p.images.every(isStock), p.id).toBe(true) })
  it('hotels (three photos each)', () => { for (const h of s.hotels) { expect(h.images).toHaveLength(3); expect(h.images.every(isStock), h.id).toBe(true) } })
  it('trip and public-trip covers', () => {
    for (const t of s.trips) expect(isStock(t.coverImage ?? ''), t.id).toBe(true)
    for (const p of s.publicTrips) expect(isStock(p.coverImage), p.id).toBe(true)
  })
  it('the seeded Goa memories', () => { for (const m of s.memories) if (m.mediaKey?.startsWith('seed:')) expect(isStock(photoUrl(m.mediaKey.split(':')[1]!)), m.id).toBe(true) })
  it('a public trip’s own places carry photos too', () => { for (const p of s.publicTrips) for (const place of p.snapshot.places) expect(place.images.every(isStock), place.id).toBe(true) })
})

describe('no two places share the same photo', () => {
  it('uses each Commons file at most once for distinct places', () => {
    const s = buildSeed()
    const byFile = new Map<string, string[]>()
    for (const p of s.places) for (const img of p.images) byFile.set(img.split('#')[0]!, [...(byFile.get(img.split('#')[0]!) ?? []), p.id])
    expect([...byFile.entries()].filter(([, ids]) => ids.length > 1)).toEqual([])
  })
})

describe('credits', () => {
  it('every photo has a free licence, an author and a Commons page to credit', () => {
    const list = allPhotos()
    expect(list.length).toBeGreaterThan(40)
    for (const p of list) {
      expect(p.license, p.title).toMatch(/^(CC0|Public domain|PD|CC[ -]BY)/i)
      expect(p.license, p.title).not.toMatch(/NC|ND/)
      expect(p.author.length, p.title).toBeGreaterThan(0)
      expect(p.page, p.title).toMatch(/^https:\/\/commons\.wikimedia\.org\//)
    }
  })
  it('builds thumbnails at the sizes Commons serves', () => {
    const [p] = allPhotos()
    expect(thumbUrl(p!, 960)).toMatch(/\/960px-/)
  })
})

describe('installImageFallback', () => {
  it('swaps a stock photo that fails to load for its illustration, once', () => {
    const stop = installImageFallback()
    const img = document.createElement('img')
    img.src = photoUrl('p-tanah-lot')
    document.body.append(img)
    img.dispatchEvent(new Event('error'))
    expect(img.src.startsWith('data:image/svg+xml')).toBe(true)
    const first = img.src
    img.dispatchEvent(new Event('error')) // the illustration failing must not loop
    expect(img.src).toBe(first)
    img.remove()
    stop()
  })

  it('leaves other images alone', () => {
    const stop = installImageFallback()
    const img = document.createElement('img')
    img.src = 'https://example.com/a.jpg'
    document.body.append(img)
    img.dispatchEvent(new Event('error'))
    expect(img.src).toBe('https://example.com/a.jpg')
    img.remove()
    stop()
  })
})
