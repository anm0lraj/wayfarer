import {
  GoogleAuthProvider, deleteUser, getAuth, onAuthStateChanged, signInWithPopup, signOut as fbSignOut, type User as FirebaseUser,
} from 'firebase/auth'
import { claimDevice, releaseDevice, wipeLocalAccountData } from '@/data/accountData'
import { db } from '@/data/db'
import { setActorId } from '@/data/actor'
import { put } from '@/data/repositories/shared'
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

/**
 * Keeps a local profile for the account so repositories and screens can read it offline. A new device first looks for
 * the profile already stored for this account, so signing in elsewhere doesn't reset the traveller's preferences.
 */
async function ensureLocalUser(fb: FirebaseUser): Promise<User> {
  const fresh = toUser(fb)
  const existing = await db.users.get(fresh.id)
  if (existing) {
    const user: User = { ...existing, name: existing.name || fresh.name, email: fresh.email ?? existing.email, avatarUrl: existing.avatarUrl ?? fresh.avatarUrl }
    if (existing.email !== user.email || existing.avatarUrl !== user.avatarUrl) await put('users', db.users, user)
    return user
  }
  const remote = await fetchRemoteProfile(fresh.id)
  if (remote) {
    await db.users.put(remote)
    return remote
  }
  await put('users', db.users, fresh)
  return fresh
}

/** The profile stored for this account, or nothing when offline or not set up yet. */
async function fetchRemoteProfile(uid: string): Promise<User | undefined> {
  try {
    return await (await import('@/data/remote/firestoreSync')).fetchRemoteProfile(uid)
  } catch {
    return undefined
  }
}

async function sessionFor(fb: FirebaseUser | null): Promise<Session | null> {
  if (!fb) {
    setActorId(null)
    return null
  }
  await claimDevice(fb.uid) // a different account's leftovers are removed before this one is shown anything
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
    const google = new GoogleAuthProvider()
    // Without this Google silently reuses the last account, so after signing out there is no way to pick another one.
    google.setCustomParameters({ prompt: 'select_account' })
    const cred = await signInWithPopup(auth(), google)
    return (await sessionFor(cred.user))!
  },

  /**
   * Signs out and removes this account's data from the device, so the next person here finds nothing of theirs. The
   * caller is expected to have offered to save unsent work first (`unsentWork`); this does not ask.
   */
  async signOut() {
    await fbSignOut(auth())
    setActorId(null)
    await wipeLocalAccountData()
    await releaseDevice()
  },

  async deleteAccount() {
    const fb = auth().currentUser
    if (!fb) return
    // Firebase asks for a recent sign-in before deleting an account; if so the error says so and nothing is removed.
    await deleteUser(fb)
    setActorId(null)
    await wipeLocalAccountData()
    await releaseDevice()
  },

  async idToken() {
    // The SDK refreshes the token when it is close to expiring, so this is always valid.
    return (await auth().currentUser?.getIdToken()) ?? null
  },

  onAuthChange(cb) {
    // Loading a profile takes a moment and signing out doesn't; chain the callbacks so they reach the app in the order
    // Firebase reported them, or a quick sign-out could be overwritten by the sign-in before it.
    let queue: Promise<void> = Promise.resolve()
    return onAuthStateChanged(auth(), (fb) => { queue = queue.then(() => sessionFor(fb)).then(cb) })
  },
}
