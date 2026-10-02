import {
  GoogleAuthProvider, deleteUser, getAuth, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User as FirebaseUser,
} from 'firebase/auth'
import { db } from '@/data/db'
import { setActorId } from '@/data/actor'
import { getFirebaseApp } from '@/services/firebase/app'
import type { User } from '@/types'
import type { AuthService, Session } from './types'

const auth = () => getAuth(getFirebaseApp())

/** Our `User` for a Firebase account. Preferences and settings start empty and are filled in by onboarding. */
export function toUser(fb: Pick<FirebaseUser, 'uid' | 'displayName' | 'email' | 'photoURL'>, now = new Date().toISOString()): User {
  return {
    id: fb.uid,
    name: fb.displayName?.trim() || fb.email?.split('@')[0] || 'Traveller',
    email: fb.email ?? undefined,
    avatarUrl: fb.photoURL ?? undefined,
    preferences: { interests: [], preferredDestinations: [] },
    settings: { theme: 'system', notificationPrefs: {} },
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** Keeps a local profile for the account so repositories and screens can read it offline. Existing choices are kept. */
async function ensureLocalUser(fb: FirebaseUser): Promise<User> {
  const fresh = toUser(fb)
  const existing = await db.users.get(fresh.id)
  const user: User = existing
    ? { ...existing, name: existing.name || fresh.name, email: fresh.email ?? existing.email, avatarUrl: existing.avatarUrl ?? fresh.avatarUrl }
    : fresh
  if (!existing || existing.email !== user.email || existing.avatarUrl !== user.avatarUrl) await db.users.put(user)
  return user
}

async function sessionFor(fb: FirebaseUser | null): Promise<Session | null> {
  if (!fb) {
    setActorId(null)
    return null
  }
  const user = await ensureLocalUser(fb)
  setActorId(user.id)
  return { user }
}

/** Real accounts through Firebase Authentication. The SDK keeps the session; nothing is stored by us in localStorage. */
export const firebaseAuthService: AuthService = {
  async getSession() {
    const a = auth()
    await a.authStateReady()
    return sessionFor(a.currentUser)
  },

  async signIn(provider) {
    if (provider !== 'google') throw new Error('Demo sign-in is only available in the demo environment.')
    const cred = await signInWithPopup(auth(), new GoogleAuthProvider())
    return (await sessionFor(cred.user))!
  },

  async signOut() {
    await fbSignOut(auth())
    setActorId(null)
  },

  async deleteAccount() {
    const fb = auth().currentUser
    if (!fb) return
    // Firebase asks for a recent sign-in before deleting an account; if so the error says so and nothing is removed.
    await deleteUser(fb)
    await Promise.all(db.tables.map((t) => t.clear()))
    setActorId(null)
  },

  onAuthChange(cb) {
    // Loading a profile takes a moment and signing out doesn't; chain the callbacks so they reach the app in the order
    // Firebase reported them, or a quick sign-out could be overwritten by the sign-in before it.
    let queue: Promise<void> = Promise.resolve()
    return onAuthStateChanged(auth(), (fb) => { queue = queue.then(() => sessionFor(fb)).then(cb) })
  },
}
