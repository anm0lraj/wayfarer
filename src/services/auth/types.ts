import type { User } from '@/types'

export interface Session {
  user: User
}

export interface AuthService {
  getSession(): Promise<Session | null>
  signIn(provider: 'demo' | 'google'): Promise<Session>
  signOut(): Promise<void>
  /** Permanently removes the account and all of its local data. */
  deleteAccount(): Promise<void>
  onAuthChange(cb: (session: Session | null) => void): () => void
  /** A fresh sign-in token for calling our own serverless functions, or null when not signed in (or on the demo backend). */
  idToken(): Promise<string | null>
}
