import { timingSafeEqual } from 'node:crypto'
import { json } from '../_lib/ai/http.js'
import { serviceAccount } from '../_lib/admin/google.js'
import { runSweep } from '../_lib/push/sweep.js'

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret || (!serviceAccount() && !process.env.FIRESTORE_REST_URL)) return json({ error: 'not_configured' }, 503)
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; the GitHub schedule sends the same header.
  const given = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1] ?? ''
  if (!same(given, secret)) return json({ error: 'unauthorized' }, 401)
  try {
    return json(await runSweep())
  } catch (e) {
    console.error('Push sweep failed', e instanceof Error ? e.message : e)
    return json({ error: 'sweep_failed' }, 500)
  }
}

/** `GET|POST /api/push/sweep` — sends the reminders that are due. Called on a schedule, never from the app. */
export const GET = handle
export const POST = handle
