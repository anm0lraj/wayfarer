import { db } from '@/data/db'
import { DEMO_USER_ID, setActorId } from '@/data/actor'
import type { AuthService, Session } from './types'

const KEY = 'demo-signed-out'
const listeners = new Set<(s: Session | null) => void>()

const read = (): boolean => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
const write = (signedOut: boolean) => {
  try { signedOut ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY) } catch { /* private mode */ }
}

async function current(): Promise<Session | null> {
  if (read()) return null
  const user = await db.users.get(DEMO_USER_ID)
  return user ? { user } : null
}

async function emit() {
  const s = await current()
  setActorId(s?.user.id ?? null)
  listeners.forEach((cb) => cb(s))
}

/** Demo auth: the seeded user is signed in by default; "Sign out" lets you try the logged-out public flows. */
export const authService: AuthService = {
  async getSession() {
    const s = await current()
    setActorId(s?.user.id ?? null)
    return s
  },
  async signIn() {
    write(false)
    await emit()
    return (await current())!
  },
  async signOut() {
    write(true)
    await emit()
  },
  async deleteAccount() {
    await Promise.all(db.tables.map((t) => t.clear()))
    write(true)
    await emit()
  },
  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
