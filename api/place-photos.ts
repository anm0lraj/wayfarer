import { HttpError, authenticate, json, readJson } from './_lib/ai/http.js'
import { accessKey, cached, downloadInput, remember, searchInput, searchUnsplash, trackDownload } from './_lib/placePhotos/unsplash.js'

/**
 * Who may ask. Wherever the app's Firebase project is configured (every Vercel deployment) the caller must be signed in,
 * checked as for the assistant. A purely local `npm run dev` with the demo backend has no accounts, so there it is open.
 */
async function requireCaller(request: Request): Promise<void> {
  if (process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY) {
    await authenticate(request)
    return
  }
  if (process.env.VERCEL) throw new HttpError(503, 'not_configured')
}

function failure(e: unknown): Response {
  if (e instanceof HttpError) return json({ error: e.code }, e.status)
  console.error('place-photos failed', e)
  return json({ error: 'server_error' }, 500)
}

/**
 * `GET /api/place-photos?name=…&area=…` — one landscape photo of a place from Unsplash, with its credit, or
 * `{ photo: null }` when nothing suitable exists. 503 `not_configured` when no key is set: the app then keeps its
 * illustration. Answers may be kept by the browser for a day (the app asks each place once anyway).
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const key = accessKey()
    if (!key) throw new HttpError(503, 'not_configured')
    await requireCaller(request)
    const params = new URL(request.url).searchParams
    const parsed = searchInput.safeParse({ name: params.get('name') ?? '', area: params.get('area') || undefined })
    if (!parsed.success) throw new HttpError(400, 'bad_request')
    const hit = cached(parsed.data)
    const photo = hit ? hit.photo : await searchUnsplash(key, parsed.data)
    if (!hit) remember(parsed.data, photo)
    return json({ photo }, 200, { 'Cache-Control': 'private, max-age=86400' })
  } catch (e) {
    return failure(e)
  }
}

/** `POST /api/place-photos` `{ downloadLocation }` — tells Unsplash the app stored that photo for a place (their download event). */
export async function POST(request: Request): Promise<Response> {
  try {
    const key = accessKey()
    if (!key) throw new HttpError(503, 'not_configured')
    await requireCaller(request)
    const parsed = downloadInput.safeParse(await readJson(request, 2_000))
    if (!parsed.success) throw new HttpError(400, 'bad_request')
    await trackDownload(key, parsed.data.downloadLocation)
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return failure(e)
  }
}
