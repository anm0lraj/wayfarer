/**
 * Talking to Gemini through its OpenAI-compatible endpoint. Groq and most other providers speak the same dialect, so
 * moving provider is a matter of `AI_BASE_URL`, `AI_MODEL` and the key (all server-side environment variables).
 */
const BASE = () => process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai'

export interface ProviderConfig { key: string; model: string; /** Tried when the main model is overloaded. */ fallbackModel?: string }

/** The provider settings, or undefined when no key is set (the endpoints then answer "not configured"). */
export function providerConfig(): ProviderConfig | undefined {
  const key = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY
  if (!key) return undefined
  return { key, model: process.env.AI_MODEL ?? 'gemini-3.1-flash-lite', fallbackModel: process.env.AI_FALLBACK_MODEL ?? 'gemini-3.5-flash-lite' }
}

/**
 * How much the model "thinks" before answering. Gemini 3 models reason first, which adds seconds; chat wants the quickest
 * answer ('minimal') while drafting a plan can afford a little more ('low'). `AI_REASONING_CHAT` / `AI_REASONING_PLAN`
 * change these ('minimal' | 'low' | 'medium' | 'high'), and 'off' stops sending the setting for providers that reject it.
 */
export const reasoningFor = (kind: 'chat' | 'plan'): string | undefined => {
  const v = (kind === 'chat' ? process.env.AI_REASONING_CHAT : process.env.AI_REASONING_PLAN) ?? (kind === 'chat' ? 'minimal' : 'low')
  return v === 'off' ? undefined : v
}

export class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ProviderError'
  }
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
type Tool = { type: 'function'; function: { name: string; description: string; parameters: unknown } }

export type CompletionEvent = { type: 'text'; text: string } | { type: 'tool'; name: string; args: Record<string, unknown> }

/** Pause before retry n (0-based) after an overloaded answer. */
const BACKOFF_MS = [600, 1500]
const OVERLOADED = new Set([500, 502, 503, 504])
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve) => { const t = setTimeout(resolve, ms); signal?.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true }) })

/**
 * One call to the provider. Newer models are often briefly "overloaded" (503), so that is retried a couple of times and
 * then handed to the fallback model, all before a single word has been sent to the traveller. Other errors (a bad key,
 * an unknown model, a refused request) are not retried: trying again cannot fix them.
 */
async function post(cfg: ProviderConfig, body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const models = [cfg.model, ...(cfg.fallbackModel && cfg.fallbackModel !== cfg.model ? [cfg.fallbackModel] : [])]
  let last: ProviderError | undefined
  for (const model of models) {
    for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
      if (signal?.aborted) throw last ?? new ProviderError(499, 'Aborted')
      const res = await fetch(`${BASE()}/chat/completions`, {
        method: 'POST', signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({ ...body, model }),
      })
      if (res.ok) return res
      last = new ProviderError(res.status, (await res.text().catch(() => '')).slice(0, 300))
      if (!OVERLOADED.has(res.status)) throw last
      if (attempt < BACKOFF_MS.length) await sleep(BACKOFF_MS[attempt]! * Number(process.env.AI_RETRY_SCALE ?? 1), signal) // scale: 0 in tests
    }
  }
  throw last!
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * Streams a reply: text as it arrives, then each function call the model made (arguments are assembled from the
 * pieces the provider sends). The key never leaves the server.
 */
export async function* streamCompletion(
  cfg: ProviderConfig, input: { messages: ChatMessage[]; tools?: Tool[]; maxTokens: number; reasoning?: string; signal?: AbortSignal },
): AsyncGenerator<CompletionEvent> {
  const res = await post(cfg, { messages: input.messages, tools: input.tools, stream: true, max_tokens: input.maxTokens, temperature: 0.6, reasoning_effort: input.reasoning }, input.signal)
  if (!res.body) throw new ProviderError(502, 'Empty response')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  // Function calls in the order they began. OpenAI sends a name once, then argument fragments under one index; Gemini's
  // endpoint sends several whole calls that all claim index 0. A chunk with a name therefore always starts a new call.
  const calls: Array<{ name: string; args: string }> = []
  const open = new Map<number, number>() // stream index -> position in `calls` of the call it is currently filling
  let buffer = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let end: number
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim()
        buffer = buffer.slice(end + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        let chunk: { choices?: Array<{ delta?: { content?: string | null; tool_calls?: Array<{ index?: number; function?: { name?: string; arguments?: string } }> } }> }
        try { chunk = JSON.parse(data) } catch { continue }
        const delta = chunk.choices?.[0]?.delta
        if (delta?.content) yield { type: 'text', text: delta.content }
        for (const [n, tc] of (delta?.tool_calls ?? []).entries()) {
          const idx = tc.index ?? n
          if (tc.function?.name) {
            calls.push({ name: tc.function.name, args: '' })
            open.set(idx, calls.length - 1)
          }
          const cur = calls[open.get(idx) ?? -1]
          if (cur && tc.function?.arguments) cur.args += tc.function.arguments
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  for (const c of calls) yield { type: 'tool', name: c.name, args: parseArgs(c.args) }
}

/** One non-streamed call that must answer through `tool` (used for itineraries). Returns the function's arguments. */
export async function completeWithTool(
  cfg: ProviderConfig, input: { messages: ChatMessage[]; tool: Tool; maxTokens: number; reasoning?: string; signal?: AbortSignal },
): Promise<Record<string, unknown>> {
  const res = await post(cfg, {
    messages: input.messages, tools: [input.tool], max_tokens: input.maxTokens, temperature: 0.7, reasoning_effort: input.reasoning,
    tool_choice: { type: 'function', function: { name: input.tool.function.name } },
  }, input.signal)
  const body = (await res.json()) as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> }
  const args = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
  if (!args) throw new ProviderError(502, 'The model did not return a plan')
  return parseArgs(args)
}
