// Checks a deployed Wayfarer site from the outside: the pages and files are there and served correctly, the security
// headers are on, the server functions answer (and refuse strangers), and the build points at the right Firebase project.
//
//   npm run smoke -- https://your-site.example --project wayfarer-prod
//   npm run smoke -- http://localhost:4173 --static            (a static server such as `npm run preview`: skips the functions)
//   npm run smoke -- <protected preview url> --bypass <secret> (Vercel "Protection Bypass for Automation" secret)
//
// Exit code 0 only if every check passed. Needs Node 18+ (global fetch).
const args = process.argv.slice(2)
const url = (args.find((a) => /^https?:\/\//.test(a)) ?? '').replace(/\/$/, '')
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const staticOnly = args.includes('--static')
const project = flag('--project')
const bypass = flag('--bypass')

if (!url) {
  console.error('Usage: npm run smoke -- <https://site> [--project <firebase-project-id>] [--static] [--bypass <secret>]')
  process.exit(2)
}

const headers = bypass ? { 'x-vercel-protection-bypass': bypass } : {}
const get = (path, init = {}) => fetch(url + path, { redirect: 'manual', ...init, headers: { ...headers, ...init.headers } })
const results = []
async function check(name, fn) {
  try {
    const problem = await fn()
    results.push({ name, ok: !problem, detail: problem ?? '' })
  } catch (e) {
    results.push({ name, ok: false, detail: `error: ${e instanceof Error ? e.message : e}` })
  }
}
const expectStatus = (res, ...codes) => (codes.includes(res.status) ? undefined : `status ${res.status}, expected ${codes.join(' or ')}`)
const type = (res) => res.headers.get('content-type') ?? ''

// A protected Vercel preview answers every request with its own sign-in page: say so instead of failing everything.
const probe = await get('/').catch(() => undefined)
if (!probe) { console.error(`Could not reach ${url}`); process.exit(1) }
const probeText = await probe.clone().text().catch(() => '')
if (probe.status === 401 || /Vercel Authentication|vercel\.com\/sso/i.test(probeText)) {
  console.error(`${url} is protected by Vercel login. Pass the automation bypass secret: --bypass <secret>`)
  process.exit(1)
}

await check('home page is the app', async () => {
  return expectStatus(probe, 200) ?? (/<div id="root"/.test(probeText) ? undefined : 'no #root in the HTML')
})
await check('security headers', async () => {
  const csp = probe.headers.get('content-security-policy') ?? ''
  const missing = [
    !/default-src 'self'/.test(csp) && 'CSP default-src', !/report-uri \/api\/report/.test(csp) && 'CSP report-uri',
    !/frame-ancestors 'none'/.test(csp) && 'frame-ancestors', probe.headers.get('x-content-type-options') !== 'nosniff' && 'nosniff',
    probe.headers.get('x-frame-options') !== 'DENY' && 'X-Frame-Options',
    !/localhost|127\.0\.0\.1/.test(url) && !probe.headers.get('strict-transport-security') && 'HSTS',
  ].filter(Boolean)
  return missing.length ? `missing: ${missing.join(', ')}` : undefined
})
for (const path of ['/privacy', '/terms', '/signin', '/explore']) {
  await check(`${path} serves the app`, async () => { const r = await get(path); return expectStatus(r, 200) ?? (/text\/html/.test(type(r)) ? undefined : `content-type ${type(r)}`) })
}
await check('robots.txt', async () => { const r = await get('/robots.txt'); return expectStatus(r, 200) ?? (/Disallow: \/api\//.test(await r.text()) ? undefined : 'does not disallow /api/') })
await check('web app manifest', async () => { const r = await get('/manifest.webmanifest'); return expectStatus(r, 200) ?? ((await r.json()).name ? undefined : 'no name') })
for (const file of ['/sw.js', '/push-sw.js']) {
  await check(`${file} is JavaScript`, async () => { const r = await get(file); return expectStatus(r, 200) ?? (/javascript/.test(type(r)) ? undefined : `content-type ${type(r)} (is the SPA rewrite catching it?)`) })
}
await check('font is a font, not the app', async () => { const r = await get('/fonts/inter-latin.woff2'); return expectStatus(r, 200) ?? (/font|octet/.test(type(r)) ? undefined : `content-type ${type(r)}`) })

const home = probeText
const script = /src="(\/assets\/index-[^"]+\.js)"/.exec(home)?.[1]
await check('the build is wired to the right backend', async () => {
  if (!script) return 'cannot find the main script'
  const js = await (await get(script)).text()
  const ids = [...new Set(js.match(/wayfarer-(?:dev|prod)[a-z0-9-]*/g) ?? [])]
  if (!project) { console.log(ids.length ? '  (build uses Firebase project ' + ids.join(', ') + ')' : '  (build is on the demo backend)'); return undefined }
  if (!ids.length) return 'no Firebase project id in the build: it is on the demo backend'
  const wrong = ids.filter((id) => !id.startsWith(project))
  return ids.some((id) => id.startsWith(project)) && !wrong.length ? undefined : `build mentions ${ids.join(', ')}, expected only ${project}*`
})

if (!staticOnly) {
  await check('unknown shared link is a 404 that still serves the app', async () => { const r = await get('/t/this-page-does-not-exist'); return expectStatus(r, 404) ?? (/<div id="root"/.test(await r.text()) ? undefined : 'no app in the 404') })
  for (const [path, method] of [['/api/ai/chat', 'POST'], ['/api/push/test', 'POST'], ['/api/account/delete', 'POST']]) {
    await check(`${method} ${path} refuses a stranger`, async () => { const r = await get(path, { method }); return expectStatus(r, 401) ?? ((await r.json()).error === 'sign_in_required' ? undefined : 'unexpected body') })
  }
  await check('push sweep refuses without the secret', async () => { const r = await get('/api/push/sweep'); return r.status === 401 ? undefined : r.status === 503 ? 'status 503: CRON_SECRET or FIREBASE_SERVICE_ACCOUNT is not set on this deployment' : `status ${r.status}, expected 401` })
  await check('crash reports are accepted', async () => { const r = await get('/api/report', { method: 'POST', body: JSON.stringify({ kind: 'smoke-test' }), headers: { 'Content-Type': 'application/json' } }); return expectStatus(r, 202) })
}

const width = Math.max(...results.map((r) => r.name.length))
for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)}${r.detail ? '  ' + r.detail : ''}`)
const failed = results.filter((r) => !r.ok).length
console.log(failed ? `\n${failed} of ${results.length} checks failed` : `\nAll ${results.length} checks passed`)
process.exit(failed ? 1 : 0)
