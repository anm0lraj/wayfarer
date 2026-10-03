/**
 * Serves `/api/*` from the MSW handlers inside the page by wrapping `fetch`, instead of MSW's service worker.
 * Reason: the PWA's Workbox service worker already owns scope "/", and a page can only have one — so a second
 * (MSW) worker would break offline support. The handlers are plain MSW handlers, so they also work with
 * `setupServer` in tests or a real MSW worker if preferred.
 *
 * The handlers (and MSW itself) are imported on the first `/api/` request, keeping them out of the initial bundle.
 *
 * Everything that is not our own mocked `/api/` goes to the real `fetch` untouched. The URL is read without building a
 * `Request` first: building one from a `Request` that has a body *consumes* that body, and the real fetch would then
 * fail with "Request object that has already been used" — which silently broke Firestore's connection.
 */
export function installMockApi(options: { passThrough?: string[] } = {}): void {
  const passThrough = options.passThrough ?? []
  const realFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = async (input, init) => {
    const origin = globalThis.location?.origin
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw, origin ?? 'http://localhost')
    // Paths served by real functions (e.g. the live assistant) go to the network, not to the in-page mock.
    if (!url.pathname.startsWith('/api/') || (origin && url.origin !== origin) || passThrough.some((p) => url.pathname.startsWith(p))) return realFetch(input, init)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new TypeError('Failed to fetch')
    const { serve } = await import('./serve')
    return serve(new Request(input, init))
  }
}
