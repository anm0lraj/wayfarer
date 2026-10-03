import { ProviderError, providerConfig, streamCompletion, type ChatMessage } from '../_lib/ai/gemini.js'
import { HttpError, authenticate, json, readJson } from '../_lib/ai/http.js'
import { chatSystemPrompt } from '../_lib/ai/prompts.js'
import { chargeCredits, checkCredits } from '../_lib/ai/quota.js'
import { chatBody } from '../_lib/ai/schemas.js'
import { CHAT_TOOLS, groundedAction } from '../_lib/ai/tools.js'

/** Newest messages kept in the prompt: enough for context, bounded so one chat cannot grow without limit. */
const HISTORY = 16

const line = (o: unknown) => new TextEncoder().encode(JSON.stringify(o) + '\n')

/**
 * `POST /api/ai/chat` — streams the assistant's reply as newline-delimited JSON (`token`, `action`, `done`, `error`),
 * the same shape the app's in-page mock produces. The model key stays here; the model can only propose actions.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const who = await authenticate(request)
    const parsed = chatBody.safeParse(await readJson(request))
    if (!parsed.success) throw new HttpError(400, 'bad_request')
    const cfg = providerConfig()
    if (!cfg) throw new HttpError(503, 'ai_not_configured')
    const body = parsed.data
    const allowance = await checkCredits(who, 1)

    const messages: ChatMessage[] = [
      { role: 'system', content: chatSystemPrompt(body.context, body.catalogue ?? []) },
      ...body.messages.slice(-HISTORY),
    ]
    const grounding = { catalogue: body.catalogue ?? [], context: body.context }

    const stream = new ReadableStream({
      async start(controller) {
        let charged = false
        // Charged on the first thing the model says: if the provider is down the traveller is not billed for it.
        const charge = async () => { if (!charged) { charged = true; await chargeCredits(who, 1) } }
        try {
          for await (const ev of streamCompletion(cfg, { messages, tools: body.context ? CHAT_TOOLS : undefined, maxTokens: 900, signal: request.signal })) {
            await charge()
            if (ev.type === 'text') controller.enqueue(line({ type: 'token', text: ev.text }))
            else {
              const action = groundedAction(ev.name, ev.args, grounding)
              if (action) controller.enqueue(line({ type: 'action', action }))
            }
          }
          controller.enqueue(line({ type: 'done' }))
        } catch (e) {
          if (!request.signal.aborted) {
            // The provider's answer goes to the server log (never to the traveller); the app only learns the status.
            console.error('AI provider failed', e instanceof ProviderError ? { status: e.status, detail: e.message } : e)
            const status = e instanceof ProviderError ? e.status : undefined
            controller.enqueue(line({ type: 'error', message: status === 429 ? 'The assistant is busy. Try again in a minute.' : `The assistant couldn’t finish that reply${status ? ` (provider ${status})` : ''}.` }))
          }
        } finally {
          controller.close()
        }
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Credits-Used': String(allowance.used + 1), 'X-Credits-Limit': String(allowance.limit) } })
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status)
    return json({ error: 'server_error' }, 500)
  }
}
