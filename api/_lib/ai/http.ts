import { firestoreBase } from '../firestore.js'

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } })

/** Reads a JSON body, refusing anything large before parsing it. */
export async function readJson(request: Request, maxBytes = 96_000): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > maxBytes) throw new HttpError(413, 'too_large')
  const text = await request.text()
  if (text.length > maxBytes) throw new HttpError(413, 'too_large')
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'bad_json')
  }
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, public extra?: Record<string, unknown>) {
    super(code)
    this.name = 'HttpError'
  }
}

/** `email` only when Google says the person has verified it; `signedInAt` is when they last proved who they are (seconds). */
export interface Caller { uid: string; token: string; email?: string; signedInAt?: number }

/** When the ID token's owner last signed in (`auth_time`). The token was already checked with Firebase, so its claims can be read. */
function signInTime(token: string): number | undefined {
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as { auth_time?: number }
    return typeof claims.auth_time === 'number' ? claims.auth_time : undefined
  } catch {
    return undefined
  }
}

const projectKey = () => process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY
const identityBase = () => process.env.IDENTITY_TOOLKIT_URL ?? 'https://identitytoolkit.googleapis.com'

/**
 * Who is calling: the Firebase ID token the app sends is checked with Firebase itself (it rejects forged, expired and
 * revoked tokens), and the account id comes from that answer, never from anything the caller wrote.
 */
export async function authenticate(request: Request): Promise<Caller> {
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token) throw new HttpError(401, 'sign_in_required')
  const key = projectKey()
  if (!key) throw new HttpError(503, 'not_configured')
  let res: Response
  try {
    res = await fetch(`${identityBase()}/v1/accounts:lookup?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
    })
  } catch {
    throw new HttpError(503, 'auth_unavailable')
  }
  if (!res.ok) throw new HttpError(401, 'sign_in_required')
  const uid = ((await res.json()) as { users?: Array<{ localId?: string; disabled?: boolean; email?: string; emailVerified?: boolean }> }).users?.[0]
  if (!uid?.localId || uid.disabled) throw new HttpError(401, 'sign_in_required')
  return { uid: uid.localId, token, email: uid.emailVerified ? uid.email?.toLowerCase() : undefined, signedInAt: signInTime(token) }
}

/** Test hook: where the quota documents live. */
export const quotaBase = firestoreBase
