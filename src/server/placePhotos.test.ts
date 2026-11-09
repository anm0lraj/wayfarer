import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { placePhotoSchema } from '@/types'
import { GET, POST } from '../../api/place-photos'
import { clearCache, pickPhoto, sized, withUtm } from '../../api/_lib/placePhotos/unsplash'

const DL = 'https://api.unsplash.com/photos/abc123/download?ixid=M3wxMjA3fDB8MXxzZWFyY2g'
const photo = (over: Record<string, unknown> = {}) => ({
  id: 'abc123', width: 4000, height: 2667, alt_description: 'rice terraces in the morning', description: null,
  urls: { raw: 'https://images.unsplash.com/photo-1537996194471?ixid=M3wxMjA3&ixlib=rb-4.0.3' },
  links: { html: 'https://unsplash.com/photos/abc123', download_location: DL },
  user: { name: 'Ana Photographer', links: { html: 'https://unsplash.com/@ana' } },
  ...over,
})
const results = (...r: unknown[]) => Response.json({ total: r.length, results: r })

const get = (q: string, headers: Record<string, string> = {}) => GET(new Request(`http://localhost/api/place-photos?${q}`, { headers }))
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request('http://localhost/api/place-photos', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }))

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  clearCache()
  vi.stubEnv('UNSPLASH_ACCESS_KEY', 'test-key')
  vi.stubEnv('VITE_FIREBASE_API_KEY', '')
  vi.stubEnv('FIREBASE_API_KEY', '')
  vi.stubEnv('VERCEL', '')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('GET /api/place-photos', () => {
  it('searches Unsplash with the key on the server and answers with a credited, hotlinked photo', async () => {
    const fetchMock = stubFetch(() => results(photo()))
    const res = await get('name=Tegallalang%20Rice%20Terrace&area=Bali')
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, max-age=86400')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/^https:\/\/api\.unsplash\.com\/search\/photos\?/)
    expect(new URL(url).searchParams.get('query')).toBe('Tegallalang Rice Terrace Bali')
    expect(new URL(url).searchParams.get('orientation')).toBe('landscape')
    expect((init.headers as Record<string, string>).Authorization).toBe('Client-ID test-key')

    const { photo: p } = (await res.json()) as { photo: Record<string, unknown> & { credit: Record<string, string> } }
    expect(placePhotoSchema.safeParse(p).success).toBe(true)
    expect(p.url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-1537996194471\?ixid=M3wxMjA3&ixlib=rb-4\.0\.3&w=1280&fm=webp&q=60/)
    expect([p.width, p.height]).toEqual([1280, 853])
    expect(p.alt).toBe('rice terraces in the morning')
    expect(p.downloadLocation).toBe(DL)
    // Attribution as Unsplash requires: the photographer and Unsplash, each linked with the referral parameters.
    expect(p.credit).toEqual({
      name: 'Ana Photographer', provider: 'Unsplash',
      profileUrl: 'https://unsplash.com/@ana?utm_source=travel_planner_app&utm_medium=referral',
      providerUrl: 'https://unsplash.com/?utm_source=travel_planner_app&utm_medium=referral',
      photoUrl: 'https://unsplash.com/photos/abc123?utm_source=travel_planner_app&utm_medium=referral',
    })
    expect(JSON.stringify(p)).not.toContain('test-key')
  })

  it('uses the configured Unsplash app name in the referral links', async () => {
    vi.stubEnv('UNSPLASH_APP_NAME', 'wayfarer app')
    expect(withUtm('https://unsplash.com/@ana')).toBe('https://unsplash.com/@ana?utm_source=wayfarer_app&utm_medium=referral')
  })

  it('answers no photo when nothing suitable is found, and skips results that are tall or malformed', async () => {
    stubFetch(() => results())
    expect(await (await get('name=Nowhere%20Cafe')).json()).toEqual({ photo: null })
    clearCache()
    stubFetch(() => results(photo({ width: 1000, height: 3000 }), photo({ urls: { raw: 'https://evil.example/x.jpg' } }), photo({ id: 'ok', alt_description: null, description: 'Second' })))
    const { photo: p } = (await (await get('name=Somewhere')).json()) as { photo: { alt: string } }
    expect(p.alt).toBe('Second')
    expect(pickPhoto({ results: 'nope' }, { name: 'x' })).toBeNull()
  })

  it('remembers an answer so the same place costs one Unsplash request', async () => {
    const fetchMock = stubFetch(() => results(photo()))
    await get('name=Tegallalang&area=Bali')
    await get('name=tegallalang&area=bali')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('answers 503 without a key, so the app keeps its illustration, and never calls Unsplash', async () => {
    vi.stubEnv('UNSPLASH_ACCESS_KEY', '')
    const fetchMock = stubFetch(() => results(photo()))
    const res = await get('name=Tegallalang')
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'not_configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses bad input before calling Unsplash', async () => {
    const fetchMock = stubFetch(() => results(photo()))
    for (const q of ['', 'name=x', `name=${'a'.repeat(101)}`, `name=Beach&area=${'b'.repeat(81)}`]) {
      expect((await get(q)).status, q).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [401, 502, 'provider_auth'], [403, 502, 'provider_auth'], [429, 503, 'rate_limited'], [500, 502, 'provider_error'], [503, 502, 'provider_error'],
  ])('turns an Unsplash %i into %i %s without leaking details', async (status, ours, code) => {
    stubFetch(() => new Response('Rate Limit Exceeded / OAuth error', { status }))
    const res = await get('name=Tegallalang')
    expect(res.status).toBe(ours)
    expect(await res.json()).toEqual({ error: code })
  })

  it('answers 504 when Unsplash cannot be reached', async () => {
    stubFetch(() => { throw new TypeError('fetch failed') })
    expect((await get('name=Tegallalang')).status).toBe(504)
  })

  it('needs a signed-in caller wherever Firebase is configured', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'web-key')
    const fetchMock = stubFetch((url) => (url.includes('accounts:lookup') ? Response.json({ users: [{ localId: 'u1' }] }) : results(photo())))
    expect((await get('name=Tegallalang')).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await get('name=Tegallalang', { Authorization: 'Bearer id-token' })).status).toBe(200)
    expect(fetchMock.mock.calls.map((c) => String(c[0]))[0]).toContain('accounts:lookup')
  })

  it('is closed on Vercel when Firebase is not configured', async () => {
    vi.stubEnv('VERCEL', '1')
    stubFetch(() => results(photo()))
    expect((await get('name=Tegallalang')).status).toBe(503)
  })
})

describe('POST /api/place-photos (Unsplash download event)', () => {
  it('calls the photo’s download location with the key', async () => {
    const fetchMock = stubFetch(() => Response.json({ url: 'https://images.unsplash.com/x' }))
    const res = await post({ downloadLocation: DL })
    expect(res.status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(DL)
    expect((init.headers as Record<string, string>).Authorization).toBe('Client-ID test-key')
  })

  it('only calls Unsplash’s own download endpoint', async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 200 }))
    for (const downloadLocation of ['https://evil.example/photos/a/download', 'https://api.unsplash.com/users/me', 'http://api.unsplash.com/photos/a/download', 'https://api.unsplash.com/photos/a/download?x=<script>']) {
      expect((await post({ downloadLocation })).status, downloadLocation).toBe(400)
    }
    expect((await post('not json')).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports Unsplash refusals and a missing key', async () => {
    stubFetch(() => new Response('no', { status: 401 }))
    expect((await post({ downloadLocation: DL })).status).toBe(502)
    vi.stubEnv('UNSPLASH_ACCESS_KEY', '')
    expect((await post({ downloadLocation: DL })).status).toBe(503)
  })
})

describe('image sizes', () => {
  it('keep Unsplash’s parameters and set width, format and quality', () => {
    const u = new URL(sized('https://images.unsplash.com/photo-1?ixid=abc', 640))
    expect(Object.fromEntries(u.searchParams)).toEqual({ ixid: 'abc', w: '640', fm: 'webp', q: '60', fit: 'max' })
  })
})
