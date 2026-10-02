import { useEffect, useState, type ReactNode } from 'react'
import { ErrorState } from '@/components/feedback/States'
import { env } from '@/config/env'
import { seedIfNeeded, seedReferenceData } from '@/data/seed'
import { useServices } from '@/services'
import type { Session } from '@/services/auth/types'
import { SessionProvider } from './session'

type Boot = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; session: Session | null }

/**
 * Splash gate: opens IndexedDB, seeds demo data on first run, restores the session. The static splash in
 * index.html stays visible until this resolves, so there is no blank frame.
 */
export function Bootstrap({ children }: { children: ReactNode }) {
  const { auth } = useServices()
  const [boot, setBoot] = useState<Boot>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await (env.backend === 'firebase' ? seedReferenceData() : seedIfNeeded())
        const session = await auth.getSession()
        if (!cancelled) setBoot({ status: 'ready', session })
      } catch (e) {
        if (!cancelled) setBoot({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
      }
    })()
    return () => { cancelled = true }
  }, [auth, attempt])

  if (boot.status === 'loading') return <div id="splash" role="status" aria-label="Loading">Wayfarer</div>
  if (boot.status === 'error') {
    return (
      <ErrorState as="h1"
        title="Couldn’t open local storage"
        description={`Wayfarer keeps your trips on this device. Private browsing or blocked site data can prevent that. (${boot.message})`}
        onRetry={() => { setBoot({ status: 'loading' }); setAttempt((n) => n + 1) }}
      />
    )
  }
  return <SessionProvider initial={boot.session}>{children}</SessionProvider>
}
