import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as report, normalise } from '../../api/report'

let logged: string[] = []
beforeEach(() => { logged = []; vi.spyOn(console, 'warn').mockImplementation((line: string) => { logged.push(line) }) })
afterEach(() => vi.restoreAllMocks())

const post = (body: unknown, raw = false) => report(new Request('https://x.test/api/report', { method: 'POST', body: raw ? String(body) : JSON.stringify(body) }))
const entries = () => logged.map((l) => (JSON.parse(l) as { report: Record<string, unknown> }).report)

describe('crash reports', () => {
  it('logs the error, where it happened and the build, and nothing else', async () => {
    const res = await post({ kind: 'error', message: 'x is undefined', stack: 'at a (b.js:1)', route: '/trips/t1', build: 'production', agent: 'Chrome', userEmail: 'a@b.c', token: 'secret' })
    expect(res.status).toBe(202)
    expect(entries()).toEqual([{ type: 'error', message: 'x is undefined', stack: 'at a (b.js:1)', route: '/trips/t1', build: 'production', agent: 'Chrome' }])
    expect(logged.join('')).not.toMatch(/a@b\.c|secret/)
  })

  it('cuts long fields down', async () => {
    await post({ kind: 'error', message: 'm'.repeat(2000), stack: 's'.repeat(3000), route: '/r'.repeat(300) })
    const [e] = entries()
    expect((e!.message as string).length).toBe(300)
    expect((e!.stack as string).length).toBe(800)
    expect((e!.route as string).length).toBe(200)
  })
})

describe('policy violation reports', () => {
  it('reads the classic report and drops query strings from addresses', async () => {
    await post({ 'csp-report': { 'violated-directive': 'img-src', 'blocked-uri': 'https://evil.test/p.png?token=abc', 'document-uri': 'https://app.test/t/x?utm=1#frag', 'source-file': 'https://app.test/assets/a.js' } })
    expect(entries()).toEqual([{ type: 'csp', directive: 'img-src', blocked: 'https://evil.test/p.png', page: 'https://app.test/t/x', source: 'https://app.test/assets/a.js' }])
  })

  it('reads the newer Reporting API list', () => {
    expect(normalise([
      { type: 'csp-violation', body: { effectiveDirective: 'connect-src', blockedURL: 'https://x.test/a?b=1', documentURL: 'https://app.test/?q=secret' } },
      { type: 'deprecation', body: {} },
    ])).toEqual([{ type: 'csp', directive: 'connect-src', blocked: 'https://x.test/a', page: 'https://app.test/', source: undefined }])
  })
})

describe('abuse', () => {
  it('answers the same whatever is sent, and logs nothing for junk, oversized bodies or other shapes', async () => {
    for (const body of ['not json', JSON.stringify({ kind: 'something else' }), JSON.stringify({ kind: 'error', message: 'x'.repeat(20_000) }), '[]', 'null']) {
      expect((await post(body, true)).status).toBe(202)
    }
    expect(logged).toEqual([])
  })

  it('logs at most five entries per request', async () => {
    await post(Array.from({ length: 50 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src' } })))
    expect(logged).toHaveLength(5)
  })
})
