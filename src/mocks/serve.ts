import { getResponse } from 'msw'
import { aiHandlers } from './handlers/ai'
import { dataHandlers } from './handlers/data'

export const handlers = [...aiHandlers, ...dataHandlers]

/** Resolves a request against the mock backend. Loaded lazily (see install.ts) so MSW stays out of the initial bundle. */
export async function serve(request: Request): Promise<Response> {
  const response = await getResponse(handlers, request)
  return response ?? new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
}
