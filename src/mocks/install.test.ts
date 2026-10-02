import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMockApi } from './install'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })

describe('mock API fetch wrapper', () => {
  it('passes requests for other sites through untouched, including their bodies', async () => {
    // Firestore sends `fetch(new Request(url, { method: 'POST', body }))`; reading that request before handing it on
    // would use up the body and the real fetch would fail with "Request object that has already been used".
    const real = vi.fn(async (_input: RequestInfo | URL) => new Response('ok'))
    globalThis.fetch = real as unknown as typeof fetch
    installMockApi()

    const request = new Request('https://firestore.googleapis.com/channel', { method: 'POST', body: 'count=1' })
    const res = await globalThis.fetch(request)

    expect(await res.text()).toBe('ok')
    expect(real).toHaveBeenCalledOnce()
    expect(real.mock.calls[0]![0]).toBe(request)
    expect(request.bodyUsed).toBe(false)
  })

  it('passes plain string and URL inputs through', async () => {
    const real = vi.fn(async (_input: RequestInfo | URL) => new Response('ok'))
    globalThis.fetch = real as unknown as typeof fetch
    installMockApi()
    await globalThis.fetch('https://example.com/a')
    await globalThis.fetch(new URL('https://example.com/b'))
    expect(real).toHaveBeenCalledTimes(2)
  })
})
