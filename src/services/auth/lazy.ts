import type { AuthService, Session } from './types'

/**
 * The Firebase adapter, loaded on first use so builds on the demo backend (and the first paint of every build) don't
 * pay for the SDK. `onAuthChange` is synchronous in the interface, so its unsubscribe waits for the module.
 */
export function lazyAuthService(load: () => Promise<AuthService>): AuthService {
  let loaded: Promise<AuthService> | undefined
  const svc = () => (loaded ??= load())
  return {
    getSession: () => svc().then((s) => s.getSession()),
    idToken: () => svc().then((s) => s.idToken()),
    signIn: (provider) => svc().then((s) => s.signIn(provider)),
    signOut: () => svc().then((s) => s.signOut()),
    deleteAccount: () => svc().then((s) => s.deleteAccount()),
    onAuthChange(cb: (session: Session | null) => void) {
      let off: (() => void) | undefined
      let cancelled = false
      void svc().then((s) => { if (!cancelled) off = s.onAuthChange(cb) })
      return () => { cancelled = true; off?.() }
    },
  }
}
