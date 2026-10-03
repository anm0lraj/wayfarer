import { json } from './_lib/ai/http.js'

/**
 * `POST /api/report` — where crash reports from the app and Content-Security-Policy violation reports from browsers
 * arrive. Nothing is stored: each report becomes one structured line in the function log (Vercel → Logs), which is
 * enough to notice that something broke and where. No account or personal data is accepted: addresses are cut down to
 * origin + path, and only a handful of short fields are read. Open to anyone (a crash can happen signed out), so it is
 * small, size-capped and answers every request the same way.
 */
const MAX_BYTES = 8_000
const short = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined)
/** An address without its query string or fragment (those can hold tokens or search words). */
const place = (v: unknown) => { try { const u = new URL(String(v)); return `${u.origin}${u.pathname}`.slice(0, 200) } catch { return short(v, 80) } }

export interface Entry { type: 'error' | 'csp'; [k: string]: unknown }

/** Turns the three shapes that arrive (our own error report, the old CSP report, the newer Reporting API list) into log entries. */
export function normalise(body: unknown): Entry[] {
  const b = body as Record<string, unknown> | unknown[] | null
  if (Array.isArray(b)) {
    return b.flatMap((r) => {
      const x = r as { type?: string; body?: Record<string, unknown> }
      return x?.type === 'csp-violation' && x.body
        ? [{ type: 'csp' as const, directive: short(x.body.effectiveDirective, 60), blocked: place(x.body.blockedURL), page: place(x.body.documentURL), source: place(x.body.sourceFile) }]
        : []
    })
  }
  if (b && typeof b === 'object' && 'csp-report' in b) {
    const r = (b as { 'csp-report': Record<string, unknown> })['csp-report'] ?? {}
    return [{ type: 'csp', directive: short(r['violated-directive'], 60), blocked: place(r['blocked-uri']), page: place(r['document-uri']), source: place(r['source-file']) }]
  }
  if (b && typeof b === 'object' && (b as { kind?: unknown }).kind === 'error') {
    const r = b as Record<string, unknown>
    return [{ type: 'error', message: short(r.message, 300), stack: short(r.stack, 800), route: short(r.route, 200), build: short(r.build, 20), agent: short(r.agent, 160) }]
  }
  return []
}

export async function POST(request: Request): Promise<Response> {
  const text = await request.text().catch(() => '')
  if (text.length <= MAX_BYTES) {
    try {
      for (const entry of normalise(JSON.parse(text)).slice(0, 5)) console.warn(JSON.stringify({ report: entry }))
    } catch { /* not JSON: ignore */ }
  }
  return json({ ok: true }, 202) // the same answer whatever was sent
}
