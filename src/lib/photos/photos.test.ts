import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { placeholderImage } from '@/lib/placeholder'
import { img, PHOTOS } from '.'
import { installImageFallback, photoIdOf, responsiveImage, thumbnail } from './responsive'

const entries = Object.entries(PHOTOS)

describe('stock photos (photos.json)', () => {
  it('has photos, and each one credits its author, licence and Commons page', () => {
    expect(entries.length).toBeGreaterThan(50)
    for (const [id, p] of entries) {
      expect(id, id).toMatch(/^[a-z0-9-]+$/)
      expect(p.file, id).toMatch(/^File:/)
      expect(p.title.trim(), id).not.toBe('')
      expect(p.author.trim(), id).not.toBe('')
      expect(p.author, id).not.toMatch(/[<>]/) // plain text, HTML stripped
      expect(p.licence, id).toMatch(/^(CC0|Public domain|PD|CC BY(-SA)? \d)/i)
      expect(p.licence, id).not.toMatch(/\b(NC|ND)\b/)
      expect(p.licenceUrl, id).toMatch(/^https:\/\//)
      expect(p.source, id).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
      expect(p.width, id).toBeGreaterThan(p.height)
    }
  })

  it('never uses one photo for two places', () => {
    const files = entries.map(([, p]) => p.file)
    const dupes = files.filter((f, i) => files.indexOf(f) !== i)
    expect(dupes).toEqual([])
  })

  it('ships both widths of every photo', () => {
    const dir = join(process.cwd(), 'public/photos')
    for (const [id] of entries) for (const w of [640, 1280]) expect(existsSync(join(dir, `${id}-${w}.webp`)), `${id}-${w}`).toBe(true)
    const json = readFileSync(join(process.cwd(), 'src/lib/photos/photos.json'), 'utf8')
    expect(json).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i) // no email addresses in credits copied from Commons
  })
})

describe('img()', () => {
  it('uses the self-hosted photo when there is one, else the generated illustration', () => {
    const [id] = entries[0]!
    expect(img(id)).toBe(`/photos/${id}-1280.webp`)
    expect(img('no-such-place')).toBe(placeholderImage('no-such-place', '', [16, 9]))
  })
})

describe('responsive helpers', () => {
  it('offer both widths for a stock photo and pass anything else through', () => {
    expect(responsiveImage('/photos/bali-1280.webp', '50vw')).toEqual({
      src: '/photos/bali-1280.webp', srcSet: '/photos/bali-640.webp 640w, /photos/bali-1280.webp 1280w', sizes: '50vw',
    })
    expect(responsiveImage('data:image/jpeg;base64,AAAA', '50vw')).toEqual({ src: 'data:image/jpeg;base64,AAAA' })
    expect(thumbnail('/photos/goa-1280.webp')).toBe('/photos/goa-640.webp')
    expect(thumbnail('blob:x')).toBe('blob:x')
    expect(photoIdOf('https://wayfarer.example/photos/p-tanah-lot-640.webp')).toBe('p-tanah-lot')
    expect(photoIdOf('/photos/../x-1280.webp')).toBeUndefined()
  })
})

describe('installImageFallback', () => {
  it('draws the illustration in place of a stock photo that fails to load', async () => {
    const el = document.createElement('img')
    el.setAttribute('src', '/photos/bali-1280.webp')
    el.setAttribute('srcset', '/photos/bali-640.webp 640w, /photos/bali-1280.webp 1280w')
    document.body.append(el)
    installImageFallback()
    el.dispatchEvent(new Event('error'))
    await vi.waitFor(() => expect(el.getAttribute('src')).toBe(placeholderImage('bali', '', [16, 9])))
    expect(el.hasAttribute('srcset')).toBe(false)
    el.remove()
  })
})

describe('seed images', () => {
  it('are stock photos, except places deliberately left on their illustration', async () => {
    const { buildSeed } = await import('@/data/seedData')
    const s = buildSeed()
    const urls = [
      ...s.destinations.map((d) => d.heroImage), ...s.places.flatMap((p) => p.images), ...s.hotels.flatMap((h) => h.images),
      ...s.trips.map((t) => t.coverImage ?? ''), ...s.publicTrips.map((p) => p.coverImage),
    ]
    // teamLab's photos show copyrighted artworks (see scripts/curate-photos.mjs), so it keeps its illustration.
    expect(s.places.filter((p) => !p.images[0]!.startsWith('/photos/')).map((p) => p.id)).toEqual(['j-teamlab'])
    expect(urls.filter((u) => !u.startsWith('/photos/'))).toHaveLength(1)
  })
})
