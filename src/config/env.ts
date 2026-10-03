import { z } from 'zod'

/**
 * The two environments the app runs in. They are separate backends, never a shared one:
 *  - `development`: local `npm run dev` and Vercel Preview deployments (branch `stage-2-dev`); the Firebase project `wayfarer-dev`.
 *  - `production`: Vercel Production (branch `main`); the Firebase project `wayfarer-prod`.
 * Everything here is public, build-time configuration (Firebase web config is public by design). Secrets live only on
 * the serverless side and are never read from `import.meta.env`.
 */
const schema = z
  .object({
    VITE_APP_ENV: z.enum(['development', 'production']).default('development'),
    /** `mock` keeps the in-browser demo backend; `firebase` uses the real one for this environment. */
    VITE_BACKEND: z.enum(['mock', 'firebase']).default('mock'),
    /** Forecasts: the in-page demo data, or real ones from Open-Meteo. */
    VITE_WEATHER: z.enum(['mock', 'live']).default('mock'),
    /** Route lines on the map: straight lines, or real roads from OSRM. */
    VITE_ROUTING: z.enum(['mock', 'live']).default('mock'),
    /** The assistant: the in-page demo replies, or the real model through the serverless functions in `api/ai`. */
    VITE_AI: z.enum(['mock', 'live']).default('mock'),
    VITE_FIREBASE_API_KEY: z.string().optional(),
    VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
    VITE_FIREBASE_PROJECT_ID: z.string().optional(),
    VITE_FIREBASE_STORAGE_BUCKET: z.string().optional(),
    VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
    VITE_FIREBASE_APP_ID: z.string().optional(),
    /** The public "Web Push certificate" key from Firebase → Cloud Messaging. Without it reminders stay in the app. */
    VITE_FIREBASE_VAPID_KEY: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.VITE_BACKEND !== 'firebase') return
    const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_APP_ID'] as const
    for (const key of required) if (!v[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required when VITE_BACKEND=firebase` })
    // Firebase may append a suffix to the id (wayfarer-dev-c2efe), so match the -dev / -prod word, not the end.
    // Guard against the classic mistake: a dev build wired to the production project (or the reverse).
    const project = v.VITE_FIREBASE_PROJECT_ID ?? ''
    if (v.VITE_APP_ENV === 'production' && /-dev(-|$)/.test(project)) ctx.addIssue({ code: 'custom', path: ['VITE_FIREBASE_PROJECT_ID'], message: `A production build must not use the dev project (${project})` })
    if (v.VITE_APP_ENV === 'development' && /-prod(-|$)/.test(project)) ctx.addIssue({ code: 'custom', path: ['VITE_FIREBASE_PROJECT_ID'], message: `A development build must not use the production project (${project})` })
  })

export interface AppEnv {
  appEnv: 'development' | 'production'
  isProduction: boolean
  backend: 'mock' | 'firebase'
  weather: 'mock' | 'live'
  routing: 'mock' | 'live'
  ai: 'mock' | 'live'
  /** Public key for web push (see `VITE_FIREBASE_VAPID_KEY`); push is available only with the Firebase backend and this. */
  pushKey?: string
  firebase?: { apiKey: string; authDomain: string; projectId: string; storageBucket: string; messagingSenderId?: string; appId: string }
}

/** Validates raw `import.meta.env`-style values. Throws one readable error listing every problem. */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.issues.map((i) => `  - ${i.message}`).join('\n')}`)
  }
  const v = parsed.data
  return {
    appEnv: v.VITE_APP_ENV,
    isProduction: v.VITE_APP_ENV === 'production',
    backend: v.VITE_BACKEND,
    weather: v.VITE_WEATHER,
    routing: v.VITE_ROUTING,
    ai: v.VITE_AI,
    pushKey: v.VITE_BACKEND === 'firebase' ? v.VITE_FIREBASE_VAPID_KEY || undefined : undefined,
    firebase:
      v.VITE_BACKEND === 'firebase'
        ? { apiKey: v.VITE_FIREBASE_API_KEY!, authDomain: v.VITE_FIREBASE_AUTH_DOMAIN!, projectId: v.VITE_FIREBASE_PROJECT_ID!, storageBucket: v.VITE_FIREBASE_STORAGE_BUCKET!, messagingSenderId: v.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: v.VITE_FIREBASE_APP_ID! }
        : undefined,
  }
}

export const env: AppEnv = parseEnv(import.meta.env)
