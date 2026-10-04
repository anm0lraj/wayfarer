import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({ env: { backend: 'firebase', appEnv: 'production' } }))

import { buildReport, installErrorReporting, reportError, resetReporting } from './monitoring'

const beacon = vi.fn((_url: string, _data: Blob) => true)
beforeEach(() => {
  resetReporting()
  beacon.mockClear()
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
})
afterEach(() => vi.restoreAllMocks())

// jsdom's Blob has no text(), so read it the way a browser page would.
const readBlob = (blob: Blob) => new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(blob) })
const sent = async () => Promise.all(beacon.mock.calls.map(async ([, blob]) => JSON.parse(await readBlob(blob)) as Record<string, unknown>))

describe('crash reports', () => {
  it('describe the error and the page path, without query strings or account details', async () => {
    window.history.pushState({}, '', '/trips/t1?secret=abc#x')
    reportError(new Error('Cannot read properties of undefined'))
    const [r] = await sent()
    expect(beacon.mock.calls[0]![0]).toBe('/api/report')
    expect(r).toMatchObject({ kind: 'error', message: 'Cannot read properties of undefined', route: '/trips/t1', build: 'prod@dev' })
    expect(JSON.stringify(r)).not.toContain('secret')
  })

  it('accept strings and odd values, and trim long messages', () => {
    expect(buildReport('plain text')!.message).toBe('plain text')
    expect(buildReport({ weird: true })!.message).toBe('Unknown error')
    expect(buildReport(new Error('x'.repeat(1000)))!.message).toHaveLength(300)
  })

  it('ignore browser and extension noise', () => {
    for (const noise of ['ResizeObserver loop completed with undelivered notifications.', 'Script error.', 'Non-Error promise rejection captured']) {
      expect(buildReport(new Error(noise)), noise).toBeUndefined()
    }
  })

  it('are sent once per message and at most five per page load', async () => {
    reportError(new Error('same'))
    reportError(new Error('same'))
    for (let i = 0; i < 10; i++) reportError(new Error(`different ${i}`))
    expect(beacon).toHaveBeenCalledTimes(5)
  })

  it('fall back to a plain request when the beacon is refused', () => {
    beacon.mockReturnValueOnce(false)
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    reportError(new Error('needs fetch'))
    expect(fetchMock).toHaveBeenCalledWith('/api/report', expect.objectContaining({ method: 'POST', keepalive: true }))
    vi.unstubAllGlobals()
  })
})

describe('listening for errors', () => {
  it('reports uncaught errors and unhandled rejections from the app, but not from other scripts', async () => {
    installErrorReporting()
    installErrorReporting() // a second call adds nothing
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('ours'), filename: `${window.location.origin}/assets/app.js` }))
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('an extension'), filename: 'chrome-extension://abc/content.js' }))
    const rejection = new Event('unhandledrejection') as Event & { reason: unknown }
    rejection.reason = new Error('promise failed')
    window.dispatchEvent(rejection)
    expect((await sent()).map((r) => r.message)).toEqual(['ours', 'promise failed'])
  })
})
