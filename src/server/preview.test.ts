import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { findPublishedPage } from '../../api/_lib/firestore'
import { buildHead, coverIsPhoto, decodeCover, escapeHtml, injectHead, parseTrip, previewDescription, type PreviewTrip } from '../../api/_lib/preview'
import { GET as pageGet } from '../../api/og'
import { GET as imageGet } from '../../api/og-image'
import indexHtml from '../../index.html?raw'

const trip = (over: Partial<PreviewTrip> = {}): PreviewTrip => ({
  id: 'pub_1', title: '5 Days in Bali', description: 'Beaches, temples and the best noodles.', ownerName: 'Ana', durationDays: 5, visibility: 'public', coverImage: '', ...over,
})

const JPEG_COVER = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64')}`

/** A Firestore REST document, as the server returns it. */
const restDoc = (t: PreviewTrip) => ({
  fields: {
    title: { stringValue: t.title }, description: { stringValue: t.description }, ownerName: { stringValue: t.ownerName },
    durationDays: { integerValue: String(t.durationDays) }, visibility: { stringValue: t.visibility }, coverImage: { stringValue: t.coverImage },
  },
})

describe('link preview tags', () => {
  it('escape anything a person wrote, so a title cannot break out of the page', () => {
    expect(escapeHtml(`"><script>alert('x')</script>&`)).toBe('&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;')
    const { tags, title } = buildHead(trip({ title: '"><img src=x onerror=alert(1)>', description: '<b>hi</b>' }), 'a-b', 'https://wayfarer.test')
    expect(tags).not.toContain('<img')
    expect(tags).not.toContain('<b>')
    expect(title).toContain('Wayfarer')
  })

  it('describe the trip, who made it, and where it lives', () => {
    const { tags } = buildHead(trip(), 'bali-ab12', 'https://wayfarer.test')
    expect(tags).toContain('<meta property="og:title" content="5 Days in Bali" />')
    expect(tags).toContain('content="Beaches, temples and the best noodles. — by Ana"')
    expect(tags).toContain('<meta property="og:url" content="https://wayfarer.test/t/bali-ab12" />')
    expect(tags).toContain('<link rel="canonical" href="https://wayfarer.test/t/bali-ab12" />')
    expect(tags).toContain('twitter:card" content="summary_large_image"')
  })

  it('use the trip’s photo as the picture, or the Wayfarer card when the cover is an illustration', () => {
    expect(buildHead(trip({ coverImage: JPEG_COVER }), 'x', 'https://w.test').tags).toContain('og:image" content="https://w.test/api/og-image?slug=x"')
    expect(buildHead(trip({ coverImage: 'data:image/svg+xml;utf8,<svg/>' }), 'x', 'https://w.test').tags).toContain('og:image" content="https://w.test/og-default.png"')
    expect(coverIsPhoto(JPEG_COVER)).toBe(true)
    expect(coverIsPhoto('data:image/svg+xml;utf8,<svg/>')).toBe(false)
    expect(decodeCover(JPEG_COVER)).toMatchObject({ type: 'image/jpeg' })
    expect(decodeCover('https://example.com/a.jpg')).toBeUndefined()
  })

  it('keep unlisted pages out of search results', () => {
    expect(buildHead(trip({ visibility: 'link' }), 'x', 'https://w.test').tags).toContain('<meta name="robots" content="noindex" />')
    expect(buildHead(trip(), 'x', 'https://w.test').tags).not.toContain('noindex')
  })

  it('keep a long description short, and fill in a missing one', () => {
    expect(previewDescription(trip({ description: 'x'.repeat(500), ownerName: '' })).length).toBeLessThanOrEqual(200)
    expect(previewDescription(trip({ description: '', ownerName: '' }))).toBe('5 days of travel')
  })

  it('replace the generic title and description in the app’s HTML and keep everything else', () => {
    const out = injectHead(indexHtml, buildHead(trip(), 'x', 'https://w.test'))
    expect(out).toContain('<title>5 Days in Bali · Wayfarer</title>')
    expect(out).not.toContain('<title>Wayfarer</title>')
    expect(out.match(/<meta name="description"/g)).toHaveLength(1)
    expect(out).toContain('<script type="module" src="/src/app/main.tsx"></script>')
    expect(out).toContain('id="root"')
  })

  it('read the fields from a Firestore REST document', () => {
    expect(parseTrip('pub_1', restDoc(trip({ visibility: 'link' })))).toMatchObject({ title: '5 Days in Bali', durationDays: 5, visibility: 'link' })
    expect(parseTrip('pub_1', {})).toBeUndefined()
  })
})

describe('the preview endpoints', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  /** The function reads index.html from disk; Firestore holds one published page under one short link. */
  function backend(t: PreviewTrip | undefined, slug = 'bali-ab12') {
    vi.stubEnv('FIRESTORE_REST_URL', 'https://firestore.test/documents')
    vi.stubEnv('APP_SHELL_FILE', join(process.cwd(), 'index.html')) // the app's HTML, read from disk as the function does
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (t && url === `https://firestore.test/documents/publicSlugs/${slug}`) return Response.json({ fields: { publicTripId: { stringValue: t.id } } })
      if (t && url === `https://firestore.test/documents/publicTrips/${t.id}`) return Response.json(restDoc(t))
      return new Response('{}', { status: 404 })
    }))
  }
  const ask = (path: string) => new Request(`https://wayfarer.test${path}`)

  it('serves the app with the trip’s tags for a real link', async () => {
    backend(trip({ coverImage: JPEG_COVER }))
    const res = await pageGet(ask('/api/og?slug=bali-ab12'))
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('s-maxage')
    expect(html).toContain('og:title" content="5 Days in Bali"')
    expect(html).toContain('og:image" content="https://wayfarer.test/api/og-image?slug=bali-ab12"')
  })

  it('serves the plain app with a 404 for a link that goes nowhere', async () => {
    backend(undefined)
    const res = await pageGet(ask('/api/og?slug=nothing-here'))
    expect(res.status).toBe(404)
    expect(await res.text()).toContain('<title>Wayfarer</title>')
  })

  it('ignores a slug that is not a slug, without asking Firestore', async () => {
    backend(trip())
    const res = await pageGet(ask(`/api/og?slug=${encodeURIComponent('../../users/someone')}`))
    expect(res.status).toBe(404)
    expect(await findPublishedPage('../x')).toBeUndefined()
    expect(vi.mocked(fetch).mock.calls.map((c) => String(c[0])).some((u) => u.includes('users'))).toBe(false)
  })

  it('serves a photo cover as an image, and nothing for an illustration', async () => {
    backend(trip({ coverImage: JPEG_COVER }))
    const photo = await imageGet(ask('/api/og-image?slug=bali-ab12'))
    expect(photo.status).toBe(200)
    expect(photo.headers.get('Content-Type')).toBe('image/jpeg')
    expect([...new Uint8Array(await photo.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

    backend(trip({ coverImage: 'data:image/svg+xml;utf8,<svg/>' }))
    expect((await imageGet(ask('/api/og-image?slug=bali-ab12'))).status).toBe(404)
  })
})
