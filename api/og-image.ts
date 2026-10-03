import { findPublishedPage } from './_lib/firestore.js'
import { decodeCover } from './_lib/preview.js'

/** `/api/og-image?slug=…` — a published trip's cover photo as a plain image, for link previews. */
export async function GET(request: Request): Promise<Response> {
  const slug = new URL(request.url).searchParams.get('slug') ?? ''
  const found = await findPublishedPage(slug).catch(() => undefined)
  const cover = decodeCover(found?.doc.fields?.coverImage?.stringValue ?? '')
  if (!cover) return new Response('Not found', { status: 404 })
  return new Response(cover.bytes, { headers: { 'Content-Type': cover.type, 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
