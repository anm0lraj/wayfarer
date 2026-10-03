import { createSign } from 'node:crypto'

/**
 * Server-to-Google sign-in with a service account, so the functions can read every traveller's trips and send push
 * messages. The key is a Vercel *Sensitive* variable (`FIREBASE_SERVICE_ACCOUNT`, the JSON downloaded from the Firebase
 * console, or that JSON base64-encoded) and never reaches the browser. It bypasses the security rules, so the only code
 * allowed to use it is the sweep and the test-push function in `api/push`.
 */
export interface ServiceAccount { client_email: string; private_key: string; project_id?: string }

export function serviceAccount(): ServiceAccount | undefined {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (!raw) return undefined
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    const v = JSON.parse(text) as Partial<ServiceAccount>
    return v.client_email && v.private_key ? { client_email: v.client_email, private_key: v.private_key, project_id: v.project_id } : undefined
  } catch {
    return undefined
  }
}

const SCOPES = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging'
const tokenUrl = () => process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token'
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url')

/** The signed assertion Google exchanges for an access token (RS256 over `header.claims`). Exported for tests. */
export function signAssertion(sa: ServiceAccount, nowSec: number): string {
  const head = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: SCOPES, aud: tokenUrl(), iat: nowSec, exp: nowSec + 3600 })}`
  const sig = createSign('RSA-SHA256').update(head).sign(sa.private_key).toString('base64url')
  return `${head}.${sig}`
}

let cached: { token: string; expiresAt: number } | undefined

/** A bearer token for Firestore and Firebase Cloud Messaging. Kept until shortly before it expires. */
export async function accessToken(now = Date.now()): Promise<string> {
  // The Firestore emulator treats the token "owner" as an administrator, which is how the sweep is tested.
  if (process.env.FIRESTORE_REST_URL) return 'owner'
  if (cached && cached.expiresAt - 60_000 > now) return cached.token
  const sa = serviceAccount()
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
  const res = await fetch(tokenUrl(), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signAssertion(sa, Math.floor(now / 1000)) }),
  })
  if (!res.ok) throw new Error(`Google refused the service account (${res.status})`)
  const body = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: body.access_token, expiresAt: now + body.expires_in * 1000 }
  return cached.token
}

export const resetTokenCache = () => { cached = undefined }
