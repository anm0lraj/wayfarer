import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findPublishedPage } from './_lib/firestore.js'
import { buildHead, injectHead, parseTrip } from './_lib/preview.js'

/**
 * The app's own index.html. It ships inside this function (vercel.json `includeFiles`) rather than being fetched from the
 * site: a fetch goes out and back in through the edge, and on a protected Preview deployment it would return Vercel's
 * sign-in page instead of the app. The fetch remains only as a fallback.
 */
async function appShell(origin: string): Promise<string> {
  const file = process.env.APP_SHELL_FILE ?? join(process.cwd(), 'dist', 'index.html')
  try {
    return await readFile(file, 'utf8')
  } catch {
    return (await fetch(`${origin}/index.html`)).text()
  }
}

/**
 * `/t/:slug` (rewritten here by vercel.json). Serves the normal app HTML with the trip's link-preview tags added.
 * If the page can't be found or read, the plain app is served (with a 404 status) so a visitor still gets the site.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug') ?? ''
  const origin = url.origin
  const html = await appShell(origin)
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
