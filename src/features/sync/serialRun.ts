import { useSyncState } from './useSyncStatus'

export const describeError = (err: unknown) => {
  if (!(err instanceof Error)) return String(err)
  const code = (err as { code?: string }).code
  return code ? `${code}: ${err.message}` : err.message
}

/**
 * Wraps a sync pass so passes never overlap: a call while one is running asks for one more pass after it instead of
 * starting another (so an edit made mid-pass is still sent). `syncing` is set for the whole run and always cleared, even
 * when a pass throws; a thrown pass is reported as a failed sync.
 */
export function serialRun(pass: () => Promise<void>): () => Promise<void> {
  let inFlight: Promise<void> | null = null
  let again = false
  return () => {
    if (inFlight) { again = true; return inFlight }
    inFlight = (async () => {
      useSyncState.setState({ syncing: true })
      try {
        do {
          again = false
          try {
            await pass()
          } catch (err) {
            useSyncState.setState({ lastFailed: true, lastError: describeError(err) })
          }
        } while (again)
      } finally {
        inFlight = null
        useSyncState.setState({ syncing: false })
      }
    })()
    return inFlight
  }
}
