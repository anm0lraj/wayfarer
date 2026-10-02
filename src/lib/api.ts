export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Typed JSON request to the app's own backend proxy (`/api/*`). Mocked in-page for now (see src/mocks/install.ts). */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown; timeoutMs?: number }): Promise<T> {
  const { json, timeoutMs = 15000, ...rest } = init ?? {}
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const abort = () => ctrl.abort()
  rest.signal?.addEventListener('abort', abort)
  try {
    const res = await fetch(new URL(path, globalThis.location?.origin ?? 'http://localhost'), {
      ...rest,
      signal: ctrl.signal,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
    rest.signal?.removeEventListener('abort', abort)
  }
}

/** Raw fetch for streaming endpoints. */
export function apiStream(path: string, json: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(new URL(path, globalThis.location?.origin ?? 'http://localhost'), {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json),
  })
}
