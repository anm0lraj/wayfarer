import { findPublishedPage } from './_lib/firestore.js'
import { buildHead, injectHead, parseTrip } from './_lib/preview.js'

/**
 * `/t/:slug` (rewritten here by vercel.json). Serves the normal app HTML with the trip's link-preview tags added.
 * If the page can't be found or read, the plain app is served (with a 404 status) so a visitor still gets the site.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') ?? ''
  const origin = url.origin
  const html = await (await fetch(`${origin}/index.html`)).text()
  const headers = { 'Content-Type': 'text/html; charset=utf-8' }

  const found = await findPublishedPage(slug).catch(() => undefined)
  const trip = found && parseTrip(found.id, found.doc)
  if (!trip) return new Response(html, { status: 404, headers: { ...headers, 'Cache-Control': 'public, s-maxage=30' } })

  return new Response(injectHead(html, buildHead(trip, slug, origin)), {
    status: 200,
    // A shared link is opened by many people at once; let the edge keep it for a minute, and serve it a bit stale while refreshing.
    headers: { ...headers, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
