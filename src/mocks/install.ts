/**
 * Serves `/api/*` from the MSW handlers inside the page by wrapping `fetch`, instead of MSW's service worker.
 * Reason: the PWA's Workbox service worker already owns scope "/", and a page can only have one — so a second
 * (MSW) worker would break offline support. The handlers are plain MSW handlers, so they also work with
 * `setupServer` in tests or a real MSW worker if preferred.
 *
 * The handlers (and MSW itself) are imported on the first `/api/` request, keeping them out of the initial bundle.
 */
export function installMockApi(): void {
  const realFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    const origin = globalThis.location?.origin
    const url = new URL(request.url, origin ?? 'http://localhost')
    if (!url.pathname.startsWith('/api/') || (origin && url.origin !== origin)) return realFetch(input, init)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new TypeError('Failed to fetch')
    const { serve } = await import('./serve')
    return serve(request)
  }
}
