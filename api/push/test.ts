import { HttpError, authenticate, json } from '../_lib/ai/http.js'
import { serviceAccount } from '../_lib/admin/google.js'
import { sendTest } from '../_lib/push/sweep.js'

/** `POST /api/push/test` — sends a test notification to the caller's own registered devices (signed-in people only). */
export async function POST(request: Request): Promise<Response> {
  try {
    const who = await authenticate(request)
    if (!serviceAccount() && !process.env.FIRESTORE_REST_URL) throw new HttpError(503, 'push_not_configured')
    const result = await sendTest(who.uid)
    if (result === 'too_soon') throw new HttpError(429, 'too_soon')
    return json(result)
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status)
    console.error('Test push failed', e instanceof Error ? e.message : e)
    return json({ error: 'server_error' }, 500)
  }
}
