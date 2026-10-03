import { ProviderError, completeWithTool, providerConfig } from '../_lib/ai/gemini.js'
import { HttpError, authenticate, json, readJson } from '../_lib/ai/http.js'
import { itinerarySystemPrompt } from '../_lib/ai/prompts.js'
import { chargeCredits, checkCredits } from '../_lib/ai/quota.js'
import { itineraryBody } from '../_lib/ai/schemas.js'
import { DAYS_TOOL, groundedDays } from '../_lib/ai/tools.js'

/** `POST /api/ai/itinerary` — a draft of `days` days. Checked here, previewed by the traveller, applied only on confirm. */
export async function POST(request: Request): Promise<Response> {
  try {
    const who = await authenticate(request)
    const parsed = itineraryBody.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'bad_request')
    const cfg = providerConfig()
    if (!cfg) throw new HttpError(503, 'ai_not_configured')
    const b = parsed.data
    await checkCredits(who, 3)

    const args = await completeWithTool(cfg, {
      messages: [{ role: 'system', content: itinerarySystemPrompt(b) }, { role: 'user', content: `Draft ${b.days} day${b.days === 1 ? '' : 's'} for ${b.destinationName ?? b.destinationId}.` }],
      tool: DAYS_TOOL, maxTokens: 3500, signal: request.signal,
    })
    const days = groundedDays(args.days, b.catalogue ?? [], b.days)
    if (days.length === 0) throw new HttpError(502, 'no_plan')
    await chargeCredits(who, 3) // only for a plan that was actually delivered
    return json({ days, summary: typeof args.summary === 'string' ? args.summary.slice(0, 300) : `A ${days.length}-day plan.` })
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status)
    if (e instanceof ProviderError) return json({ error: 'provider_error' }, e.status === 429 ? 503 : 502)
    return json({ error: 'server_error' }, 500)
  }
}
