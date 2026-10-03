import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { csp, securityHeaders } from '../../scripts/security-headers.mjs'

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> }

describe('security headers', () => {
  it('vercel.json carries exactly the headers the preview server is tested with', () => {
    const all = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)')!.headers.map((h) => [h.key, h.value]))
    expect(all).toEqual(securityHeaders)
  })

  it('forbids inline and remote scripts, framing, plugins and base-tag tricks', () => {
    expect(csp).toMatch(/script-src 'self'( https:\/\/apis\.google\.com)?(;|$)/) // only Google's sign-in script, for Firebase popup auth
    expect(csp).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/)
    for (const d of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) expect(csp).toContain(d)
  })

  it('lets the service worker fetch every image host (worker fetches use connect-src, not img-src)', () => {
    const directive = (name: string) => (csp as string).split('; ').find((d) => d.startsWith(`${name} `)) ?? ''
    const hosts = (d: string) => d.split(' ').filter((s) => s.startsWith('https://'))
    const connect = hosts(directive('connect-src'))
    for (const host of hosts(directive('img-src'))) expect(connect, `${host} is in img-src but not connect-src`).toContain(host)
  })

  it('has no inline script left in index.html', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(/<script(?![^>]*\bsrc=)[^>]*>/.test(html)).toBe(false)
  })

  it('does not rewrite the theme script to index.html', () => {
    expect(new RegExp((JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites as Array<{ source: string; destination: string }>).find((r) => r.destination === '/index.html')!.source).test('theme-init.js')).toBe(false)
  })
})
