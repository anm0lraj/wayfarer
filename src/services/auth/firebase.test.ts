import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { getActorId, setActorId } from '@/data/actor'

const fb = vi.hoisted(() => {
  const state = { currentUser: null as null | { uid: string; displayName: string | null; email: string | null; photoURL: string | null } }
  const listeners: Array<(u: typeof state.currentUser) => void> = []
  const auth = { get currentUser() { return state.currentUser }, authStateReady: () => Promise.resolve() }
  return {
    state, listeners, auth,
    lastProvider: undefined as undefined | { params?: unknown },
    signInWithPopup: vi.fn(),
    signOut: vi.fn(async () => { state.currentUser = null }),
    deleteUser: vi.fn(async () => { state.currentUser = null }),
  }
})

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class { params: unknown; setCustomParameters(p: unknown) { this.params = p; fb.lastProvider = this } },
  getAuth: () => fb.auth,
  onAuthStateChanged: (_a: unknown, cb: (u: typeof fb.state.currentUser) => void) => { fb.listeners.push(cb); return () => fb.listeners.splice(fb.listeners.indexOf(cb), 1) },
  signInWithPopup: fb.signInWithPopup,
  signOut: fb.signOut,
  deleteUser: fb.deleteUser,
}))
vi.mock('@/services/firebase/app', () => ({ getFirebaseApp: () => ({}) }))

import { firebaseAuthService, toUser } from './firebase'

const ana = { uid: 'uid-ana', displayName: 'Ana Ferreira', email: 'ana@example.com', photoURL: 'https://example.com/a.jpg' }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  fb.state.currentUser = null
  fb.listeners.length = 0
  vi.clearAllMocks()
  setActorId(null)
})

describe('Firebase auth adapter', () => {
  it('maps a Firebase account to our user, with a sensible name when none is set', () => {
    expect(toUser(ana)).toMatchObject({ id: 'uid-ana', name: 'Ana Ferreira', email: 'ana@example.com', onboardingCompleted: false })
    expect(toUser({ uid: 'u', displayName: null, email: 'sam@example.com', photoURL: null }).name).toBe('sam')
    expect(toUser({ uid: 'u', displayName: null, email: null, photoURL: null }).name).toBe('Traveller')
  })

  it('has no session until someone signs in, and sets nobody as the actor', async () => {
    expect(await firebaseAuthService.getSession()).toBeNull()
    expect(getActorId()).toBeNull()
  })

  it('signing in with Google creates the local profile and makes that account the actor', async () => {
    fb.signInWithPopup.mockImplementation(async () => { fb.state.currentUser = ana; return { user: ana } })
    const session = await firebaseAuthService.signIn('google')
    expect(session.user.id).toBe('uid-ana')
    expect(getActorId()).toBe('uid-ana')
    expect((await db.users.get('uid-ana'))?.email).toBe('ana@example.com')
  })

  it('always lets the traveller choose which Google account to use', async () => {
    fb.signInWithPopup.mockImplementation(async () => { fb.state.currentUser = ana; return { user: ana } })
    await firebaseAuthService.signIn('google')
    expect(fb.lastProvider?.params).toEqual({ prompt: 'select_account' })
  })

  it('restores the session on the next visit and keeps the profile the traveller already edited', async () => {
    await firebaseAuthService.signIn('google').catch(() => undefined)
    fb.state.currentUser = ana
    await db.users.put({ ...toUser(ana), bio: 'Slow traveller', onboardingCompleted: true })
    const session = await firebaseAuthService.getSession()
    expect(session?.user).toMatchObject({ bio: 'Slow traveller', onboardingCompleted: true })
  })

  it('refuses demo sign-in outside the demo environment', async () => {
    await expect(firebaseAuthService.signIn('demo')).rejects.toThrow('only available in the demo environment')
    expect(fb.signInWithPopup).not.toHaveBeenCalled()
  })

  it('sign out clears the actor; delete account removes the Firebase user and local data', async () => {
    fb.state.currentUser = ana
    await firebaseAuthService.getSession()
    await firebaseAuthService.signOut()
    expect(getActorId()).toBeNull()

    fb.state.currentUser = ana
    await firebaseAuthService.getSession()
    await firebaseAuthService.deleteAccount()
    expect(fb.deleteUser).toHaveBeenCalledOnce()
    expect(await db.users.count()).toBe(0)
  })

  it('reports auth changes to listeners', async () => {
    const seen: Array<string | null> = []
    const off = firebaseAuthService.onAuthChange((s) => seen.push(s?.user.id ?? null))
    fb.listeners[0]!(ana)
    fb.listeners[0]!(null)
    await vi.waitFor(() => expect(seen).toEqual(['uid-ana', null]))
    off()
    expect(fb.listeners).toHaveLength(0)
  })
})
