/**
 * Talking to Gemini through its OpenAI-compatible endpoint. Groq and most other providers speak the same dialect, so
 * moving provider is a matter of `AI_BASE_URL`, `AI_MODEL` and the key (all server-side environment variables).
 */
const BASE = () => process.env.AI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta/openai'

export interface ProviderConfig { key: string; model: string }

/** The provider settings, or undefined when no key is set (the endpoints then answer "not configured"). */
export function providerConfig(): ProviderConfig | undefined {
  const key = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY
  if (!key) return undefined
  return { key, model: process.env.AI_MODEL ?? 'gemini-3.1-flash-lite' }
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

async function post(cfg: ProviderConfig, body: unknown, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`${BASE()}/chat/completions`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ProviderError(res.status, (await res.text().catch(() => '')).slice(0, 300))
  return res
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
  cfg: ProviderConfig, input: { messages: ChatMessage[]; tools?: Tool[]; maxTokens: number; signal?: AbortSignal },
): AsyncGenerator<CompletionEvent> {
  const res = await post(cfg, { model: cfg.model, messages: input.messages, tools: input.tools, stream: true, max_tokens: input.maxTokens, temperature: 0.6 }, input.signal)
  if (!res.body) throw new ProviderError(502, 'Empty response')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const calls = new Map<number, { name: string; args: string }>()
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
          const cur = calls.get(idx) ?? { name: '', args: '' }
          if (tc.function?.name) cur.name = tc.function.name
          if (tc.function?.arguments) cur.args += tc.function.arguments
          calls.set(idx, cur)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  for (const c of [...calls.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)) if (c.name) yield { type: 'tool', name: c.name, args: parseArgs(c.args) }
}

/** One non-streamed call that must answer through `tool` (used for itineraries). Returns the function's arguments. */
export async function completeWithTool(
  cfg: ProviderConfig, input: { messages: ChatMessage[]; tool: Tool; maxTokens: number; signal?: AbortSignal },
): Promise<Record<string, unknown>> {
  const res = await post(cfg, {
    model: cfg.model, messages: input.messages, tools: [input.tool], max_tokens: input.maxTokens, temperature: 0.7,
    tool_choice: { type: 'function', function: { name: input.tool.function.name } },
  }, input.signal)
  const body = (await res.json()) as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> }
  const args = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
  if (!args) throw new ProviderError(502, 'The model did not return a plan')
  return parseArgs(args)
}
