import { firestoreBase } from '../firestore.js'
import { accessToken } from './google.js'

/**
 * Firestore over REST with the service account (administrator access, so the security rules do not apply). Values come
 * back in Firestore's typed form and are turned into plain objects here.
 */
export interface Doc { path: string; id: string; data: Record<string, unknown> }

type Value = {
  nullValue?: null; booleanValue?: boolean; integerValue?: string; doubleValue?: number; stringValue?: string; timestampValue?: string
  arrayValue?: { values?: Value[] }; mapValue?: { fields?: Record<string, Value> }
}

export function decodeValue(v: Value | undefined): unknown {
  if (!v) return undefined
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(decodeValue)
  if ('mapValue' in v) return decodeFields(v.mapValue?.fields)
  return null
}

export function decodeFields(fields: Record<string, Value> | undefined): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([k, v]) => [k, decodeValue(v)]))
}

const encode = (v: string | number | boolean): Value =>
  typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : { integerValue: String(Math.round(v)) }

/** `projects/x/databases/(default)/documents` from a REST base URL. */
const documentsRoot = (base: string) => base.replace(/^https?:\/\/[^/]+\/v1\//, '')

const toDoc = (d: { name: string; fields?: Record<string, Value> }): Doc => {
  const path = d.name.slice(d.name.indexOf('/documents/') + '/documents/'.length)
  return { path, id: path.slice(path.lastIndexOf('/') + 1), data: decodeFields(d.fields) }
}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${await accessToken()}` } })
}

async function runQuery(parent: string, structuredQuery: unknown): Promise<Doc[]> {
  const res = await call(`${firestoreBase()}${parent ? `/${parent}` : ''}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery }) })
  if (!res.ok) throw new Error(`Firestore query failed (${res.status})`)
  return ((await res.json()) as Array<{ document?: { name: string; fields?: Record<string, Value> } }>).flatMap((r) => (r.document ? [toDoc(r.document)] : []))
}

/** Every registered device (`users/{uid}/devices/{id}`), across all people. */
export const listDevices = (limit = 2000) =>
  runQuery('', { from: [{ collectionId: 'devices', allDescendants: true }], limit })

export async function getDocument(path: string): Promise<Doc | undefined> {
  const res = await call(`${firestoreBase()}/${path}`)
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(`Firestore read failed (${res.status})`)
  return toDoc(await res.json())
}

/** The trips a person is a member of (the same query the app uses to pull them). */
export const tripsOf = (uid: string) =>
  runQuery('', {
    from: [{ collectionId: 'trips' }],
    where: { fieldFilter: { field: { fieldPath: `members.\`${uid.replace(/`/g, '')}\`` }, op: 'IN', value: { arrayValue: { values: ['owner', 'editor', 'viewer'].map((s) => ({ stringValue: s })) } } } },
    limit: 200,
  })

/** The documents of one collection, e.g. `trips/{id}/items` or `users/{uid}/devices` (up to ~1,500). */
export async function listCollection(collectionPath: string): Promise<Doc[]> {
  const out: Doc[] = []
  let pageToken = ''
  for (let page = 0; page < 5; page++) {
    const res = await call(`${firestoreBase()}/${collectionPath}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)
    if (!res.ok) throw new Error(`Firestore list failed (${res.status})`)
    const body = (await res.json()) as { documents?: Array<{ name: string; fields?: Record<string, Value> }>; nextPageToken?: string }
    out.push(...(body.documents ?? []).map(toDoc))
    if (!body.nextPageToken) break
    pageToken = body.nextPageToken
  }
  return out
}

/**
 * Creates a document only if it does not exist yet. False means it was already there, which is how the same reminder is
 * kept from being sent twice, even by two sweeps running at the same moment.
 */
export async function createIfAbsent(collectionPath: string, id: string, fields: Record<string, string | number | boolean>): Promise<boolean> {
  const res = await call(`${firestoreBase()}/${collectionPath}?documentId=${encodeURIComponent(id)}`, {
    method: 'POST', body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, encode(v)])) }),
  })
  if (res.status === 409) return false
  if (!res.ok) throw new Error(`Firestore create failed (${res.status})`)
  return true
}

export async function deleteDocument(path: string): Promise<void> {
  await call(`${firestoreBase()}/${path}`, { method: 'DELETE' })
}

export { documentsRoot }
