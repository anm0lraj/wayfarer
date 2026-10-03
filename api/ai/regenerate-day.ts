import { ProviderError, completeWithTool, providerConfig } from '../_lib/ai/gemini.js'
import { HttpError, authenticate, json, readJson } from '../_lib/ai/http.js'
import { regenerateSystemPrompt } from '../_lib/ai/prompts.js'
import { chargeCredits, checkCredits } from '../_lib/ai/quota.js'
import { regenerateBody } from '../_lib/ai/schemas.js'
import { DAYS_TOOL, groundedDays } from '../_lib/ai/tools.js'

/** `POST /api/ai/regenerate-day` — a replacement for one day, shown to the traveller as before/after. */
export async function POST(request: Request): Promise<Response> {
  try {
    const who = await authenticate(request)
    const parsed = regenerateBody.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'bad_request')
    const cfg = providerConfig()
    if (!cfg) throw new HttpError(503, 'ai_not_configured')
    const b = parsed.data
    await checkCredits(who, 2)

    const args = await completeWithTool(cfg, {
      messages: [{ role: 'system', content: regenerateSystemPrompt(b) }, { role: 'user', content: `Propose a new plan for day ${b.dayNumber}.` }],
      tool: DAYS_TOOL, maxTokens: 1500, signal: request.signal,
    })
    const [after] = groundedDays(args.days, b.catalogue ?? [], 1)
    if (!after) throw new HttpError(502, 'no_plan')
    await chargeCredits(who, 2) // only for a plan that was actually delivered
    return json({ dayNumber: b.dayNumber, before: b.current, after })
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status)
    if (e instanceof ProviderError) {
      console.error('AI provider failed', { status: e.status, detail: e.message })
      return json({ error: 'provider_error', providerStatus: e.status }, e.status === 429 ? 503 : 502)
    }
    return json({ error: 'server_error' }, 500)
  }
}
