import { env } from '@/config/env'

/**
 * Crash reporting without a vendor: an uncaught error or a screen that fails to load sends one small report to
 * `/api/report`, which writes a line to the server log. Only the error text, where it happened (the path, never the
 * query or any account detail), the build and the browser type are sent. At most a few per page load, each message once.
 */
const MAX_PER_PAGE = 5
const seen = new Set<string>()
let installed = false

/** Errors that are noise, not bugs in the app: extensions and browser quirks. */
const IGNORED = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection/i

export interface ErrorReport { kind: 'error'; message: string; stack?: string; route: string; build: string; agent: string }

export function buildReport(error: unknown, location: Pick<Location, 'pathname'> = window.location): ErrorReport | undefined {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error')
  const message = (e.message || e.name).slice(0, 300)
  if (IGNORED.test(message)) return undefined
  return { kind: 'error', message, stack: e.stack?.slice(0, 800), route: location.pathname.slice(0, 200), build: env.appEnv, agent: navigator.userAgent.slice(0, 160) }
}

export function reportError(error: unknown): void {
  if (env.backend !== 'firebase' || seen.size >= MAX_PER_PAGE) return
  const report = buildReport(error)
  if (!report || seen.has(report.message)) return
  seen.add(report.message)
  const body = JSON.stringify(report)
  try {
    if (!navigator.sendBeacon?.('/api/report', new Blob([body], { type: 'application/json' }))) throw new Error('beacon refused')
  } catch {
    void fetch('/api/report', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined)
  }
}

/** Starts listening for uncaught errors and unhandled promise rejections (once). */
export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (e) => {
    if (e.filename && !e.filename.startsWith(window.location.origin)) return // a script that is not ours (an extension)
    reportError(e.error ?? e.message)
  })
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason))
}

/** For tests. */
export const resetReporting = () => { seen.clear(); installed = false }
