import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getBlob, putBlob } from './blobStore'
import { db } from './db'

const read = (b: Blob) => new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(b) })
beforeEach(async () => { await db.blobs.clear(); vi.restoreAllMocks() })

describe('device blob store', () => {
  it('stores a photo and finds it again by key', async () => {
    // (The fake IndexedDB used in tests cannot faithfully clone a jsdom Blob, so the exact bytes are checked in the fallback test below.)
    await putBlob('trips/t/m/1', new Blob(['sunset'], { type: 'image/jpeg' }))
    expect(await db.blobs.get('trips/t/m/1')).toBeDefined()
    expect(await getBlob('trips/t/m/1')).toBeDefined()
  })

  it('keeps the raw bytes when the browser refuses to store a Blob (WebKit private browsing), and gives the same Blob back', async () => {
    const real = db.blobs.put.bind(db.blobs)
    vi.spyOn(db.blobs, 'put').mockImplementation(((rec: { blob?: Blob }) => {
      if (rec.blob) return Promise.reject(new DOMException('BlobURLs are not yet supported', 'DataCloneError'))
      return real(rec as never)
    }) as never)
    await putBlob('k', new Blob(['voice note'], { type: 'audio/webm' }))
    const rec = await db.blobs.get('k')
    expect(rec?.blob).toBeUndefined()
    expect(rec?.type).toBe('audio/webm')
    const back = await getBlob('k')
    expect(back?.type).toBe('audio/webm')
    expect(back?.size).toBe(10)
    expect(await read(back!)).toBe('voice note')
  })

  it('returns nothing for a missing key', async () => {
    expect(await getBlob('nope')).toBeUndefined()
  })
})
