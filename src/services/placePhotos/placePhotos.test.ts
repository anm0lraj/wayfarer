import { afterEach, describe, expect, it, vi } from 'vitest'
import { placePhotoSchema } from '@/types'
import { createLivePlacePhotos } from './live'
import { mockPhotoId, mockPlacePhotos } from './mock'
import { PlacePhotoError } from './types'

const photo = {
  url: 'https://images.unsplash.com/photo-1?ixid=a&w=1280&fm=webp&q=60', width: 1280, height: 853, alt: 'Rice terraces',
  credit: { name: 'Ana', profileUrl: 'https://unsplash.com/@ana?utm_source=a&utm_medium=referral', provider: 'Unsplash', providerUrl: 'https://unsplash.com/?utm_source=a&utm_medium=referral', photoUrl: 'https://unsplash.com/photos/1?utm_source=a&utm_medium=referral' },
  downloadLocation: 'https://api.unsplash.com/photos/1/download?ixid=a',
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init))
  vi.stubGlobal('fetch', fn)
  return fn
}
afterEach(() => vi.unstubAllGlobals())

describe('mock place photos', () => {
  it('give a known place its catalogue photo with a Commons credit, and nothing for anything else', async () => {
    const found = await mockPlacePhotos.search({ name: 'Tegallalang Rice Terrace', area: 'Bali' })
    expect(placePhotoSchema.parse(found)).toMatchObject({ url: '/photos/p-tegallalang-1280.webp', credit: { provider: 'Wikimedia Commons', providerUrl: 'https://commons.wikimedia.org/' } })
    expect(found!.credit.photoUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    expect(await mockPlacePhotos.search({ name: 'Revolver Espresso', area: 'Bali' })).toBeNull()
  })

  it('match whole words only, and ignore accents and case', () => {
    expect(mockPhotoId({ name: 'Sensō-ji Temple' })).toBe('j-senso-ji')
    expect(mockPhotoId({ name: 'PETITENGET BEACH' })).toBe('p-seminyak-beach')
    expect(mockPhotoId({ name: 'Bagan temples' })).toBeUndefined()
  })

  it('honour a cancelled request', async () => {
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(mockPlacePhotos.search({ name: 'Shibuya Crossing' }, ctrl.signal)).rejects.toThrow('Aborted')
  })
})

describe('live place photos (through our function)', () => {
  it('asks the function with the name, area and ID token, and returns the photo', async () => {
    const fetchMock = stubFetch(() => Response.json({ photo }))
    const service = createLivePlacePhotos({ getToken: async () => 'id-token' })
    expect(await service.search({ name: ' Tegallalang ', area: 'Bali' })).toEqual(photo)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/place-photos')
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ name: 'Tegallalang', area: 'Bali' })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer id-token')
  })

  it('returns null when nothing suitable was found', async () => {
    stubFetch(() => Response.json({ photo: null }))
    expect(await createLivePlacePhotos().search({ name: 'Nowhere' })).toBeNull()
  })

  it('fails without retry when the function refuses or answers something unexpected', async () => {
    for (const res of [Response.json({ error: 'not_configured' }, { status: 503 }), new Response('x', { status: 401 }), Response.json({ photo: { ...photo, url: 'https://evil.example/x.jpg' } }), new Response('not json')]) {
      stubFetch(() => res)
      const e = await createLivePlacePhotos().search({ name: 'Tegallalang' }).catch((x: unknown) => x)
      expect(e).toBeInstanceOf(PlacePhotoError)
      expect((e as PlacePhotoError).retryable).toBe(false)
    }
  })

  it('reports an unreachable network as retryable, and passes a cancellation through', async () => {
    stubFetch(() => { throw new TypeError('Failed to fetch') })
    const e = await createLivePlacePhotos().search({ name: 'Tegallalang' }).catch((x: unknown) => x)
    expect((e as PlacePhotoError).retryable).toBe(true)
    const ctrl = new AbortController()
    stubFetch(() => { ctrl.abort(); throw new DOMException('Aborted', 'AbortError') })
    await expect(createLivePlacePhotos().search({ name: 'Tegallalang' }, ctrl.signal)).rejects.toThrow('Aborted')
  })

  it('reports a stored photo to the function (Unsplash download event), best effort', async () => {
    const fetchMock = stubFetch(() => new Response(null, { status: 204 }))
    await createLivePlacePhotos().track(photo)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URL(url).pathname).toBe('/api/place-photos')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ downloadLocation: photo.downloadLocation })
    stubFetch(() => { throw new TypeError('offline') })
    await expect(createLivePlacePhotos().track(photo)).resolves.toBeUndefined()
    const { downloadLocation: _d, ...withoutDownload } = photo
    const none = stubFetch(() => new Response(null))
    await createLivePlacePhotos().track(withoutDownload)
    expect(none).not.toHaveBeenCalled()
  })
})
