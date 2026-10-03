import type { IncomingMessage } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

/**
 * Serves the Vercel functions in `api/ai/` and `api/push/` from the Vite dev server, so the real assistant (and the
 * test notification) can be tried locally with `npm run dev` (no `vercel dev` needed). It only exists while developing; on Vercel the same files run as functions.
 * Server-side settings such as `GEMINI_API_KEY` come from `.env.development.local` (git-ignored) and are put into
 * `process.env` for the handlers only, never into the browser bundle (they have no VITE_ prefix).
 */
const readBody = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

export function localApi(): Plugin {
  return {
    name: 'wayfarer-local-api',
    apply: 'serve',
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) if (process.env[k] === undefined) process.env[k] = v

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!/^\/api\/(ai|push)\/[a-z-]+$/.test(url.pathname)) return next()
        try {
          const mod = (await server.ssrLoadModule(`${url.pathname}.ts`)) as Record<string, ((r: Request) => Promise<Response>) | undefined>
          const handler = mod[req.method ?? 'GET']
          if (!handler) { res.statusCode = 405; return res.end() }

          const gone = new AbortController()
          res.on('close', () => { if (!res.writableEnded) gone.abort() })
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method, headers: req.headers as Record<string, string>, body: hasBody ? await readBody(req) : undefined, signal: gone.signal,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          if (response.body) {
            const reader = response.body.getReader()
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (e) {
          server.ssrFixStacktrace(e as Error)
          console.error(e)
          res.statusCode = 500
          res.end('Local API error')
        }
      })
    },
  }
}
