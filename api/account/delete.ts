import { HttpError, authenticate, json } from '../_lib/ai/http.js'
import { serviceAccount } from '../_lib/admin/google.js'
import { deleteAccountData, deleteAuthAccount } from '../_lib/account/delete.js'

/** How recently the person must have signed in to delete their account (so a forgotten open tab cannot do it). */
const RECENT_SIGN_IN_SECONDS = 10 * 60

/**
 * `POST /api/account/delete` — permanently removes the signed-in person's account and everything stored for it. Needs a
 * sign-in from the last ten minutes: otherwise the answer is `recent_login_required` and the app asks them to confirm
 * with Google, then tries again.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const who = await authenticate(request)
    if (!serviceAccount() && !process.env.FIRESTORE_REST_URL) throw new HttpError(503, 'not_configured')
    const age = Date.now() / 1000 - (who.signedInAt ?? 0)
    if (age > RECENT_SIGN_IN_SECONDS) throw new HttpError(401, 'recent_login_required')
    const report = await deleteAccountData(who.uid, who.email)
    await deleteAuthAccount(who.uid)
    return json({ deleted: true, ...report })
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status)
    console.error('Account deletion failed', e instanceof Error ? e.message : e)
    return json({ error: 'server_error' }, 500)
  }
}
