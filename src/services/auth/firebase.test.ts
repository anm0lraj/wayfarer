import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/data/db'
import { getActorId, setActorId } from '@/data/actor'

const fb = vi.hoisted(() => {
  const state = { currentUser: null as null | { uid: string; displayName: string | null; email: string | null; photoURL: string | null; getIdToken?: (force?: boolean) => Promise<string> } }
  const listeners: Array<(u: typeof state.currentUser) => void> = []
  const auth = { get currentUser() { return state.currentUser }, authStateReady: () => Promise.resolve() }
  return {
    state, listeners, auth,
    lastProvider: undefined as undefined | { params?: unknown },
    signInWithPopup: vi.fn(),
    signOut: vi.fn(async () => { state.currentUser = null }),
    reauthenticateWithPopup: vi.fn(async () => undefined),
  }
})

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class { params: unknown; setCustomParameters(p: unknown) { this.params = p; fb.lastProvider = this } },
  getAuth: () => fb.auth,
  onAuthStateChanged: (_a: unknown, cb: (u: typeof fb.state.currentUser) => void) => { fb.listeners.push(cb); return () => fb.listeners.splice(fb.listeners.indexOf(cb), 1) },
  signInWithPopup: fb.signInWithPopup,
  signOut: fb.signOut,
  reauthenticateWithPopup: fb.reauthenticateWithPopup,
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

  it('sign out clears the actor', async () => {
    fb.state.currentUser = ana
    await firebaseAuthService.getSession()
    await firebaseAuthService.signOut()
    expect(getActorId()).toBeNull()
  })

  describe('deleting the account', () => {
    const signedInAs = async () => {
      fb.state.currentUser = { ...ana, getIdToken: async (force) => (force ? 'fresh-token' : 'cached-token') }
      await firebaseAuthService.getSession()
      await db.trips.put({ id: 't1', ownerId: 'uid-ana', title: 'Ana trip' } as never)
    }
    const answers = (...statuses: Array<[number, unknown]>) => {
      const fetchMock = vi.fn(async () => { const [status, body] = statuses.shift() ?? [200, {}]; return Response.json(body, { status }) })
      vi.stubGlobal('fetch', fetchMock)
      return fetchMock
    }
    afterEach(() => vi.unstubAllGlobals())

    it('asks the server to remove everything, with a fresh token, then clears this device', async () => {
      await signedInAs()
      const fetchMock = answers([200, { deleted: true }])
      await firebaseAuthService.deleteAccount()
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string> }]
      expect(url).toBe('/api/account/delete')
      expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer fresh-token' } })
      expect(await db.users.count()).toBe(0)
      expect(await db.trips.count()).toBe(0)
      expect(getActorId()).toBeNull()
    })

    it('confirms with Google once when the session is too old, then tries again', async () => {
      await signedInAs()
      const fetchMock = answers([401, { error: 'recent_login_required' }], [200, { deleted: true }])
      await firebaseAuthService.deleteAccount()
      expect(fb.reauthenticateWithPopup).toHaveBeenCalledOnce()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(await db.trips.count()).toBe(0)
    })

    it('keeps everything on the device, and says so, when the server could not delete', async () => {
      await signedInAs()
      answers([500, { error: 'server_error' }])
      await expect(firebaseAuthService.deleteAccount()).rejects.toThrow('couldn’t delete your account')
      expect(await db.trips.count()).toBe(1)
      expect(getActorId()).toBe('uid-ana')
    })

    it('keeps everything when the person backs out of confirming with Google', async () => {
      await signedInAs()
      answers([401, { error: 'recent_login_required' }])
      fb.reauthenticateWithPopup.mockRejectedValueOnce(new Error('auth/popup-closed-by-user'))
      await expect(firebaseAuthService.deleteAccount()).rejects.toThrow('popup-closed')
      expect(await db.trips.count()).toBe(1)
    })
  })

  it('signing out removes the account’s data from the device', async () => {
    fb.state.currentUser = ana
    await firebaseAuthService.getSession()
    await db.trips.put({ id: 't1', ownerId: 'uid-ana', title: 'Ana trip' } as never)
    await db.syncQueue.add({ entity: 'trips', entityId: 't1', op: 'put', createdAt: 1, attempts: 0 })
    await firebaseAuthService.signOut()
    expect(await db.trips.count()).toBe(0)
    expect(await db.syncQueue.count()).toBe(0)
    expect(await db.users.count()).toBe(0)
  })

  it('a different account signing in never sees, or syncs, the previous one’s leftovers', async () => {
    fb.state.currentUser = ana
    await firebaseAuthService.getSession()
    await db.trips.put({ id: 't1', ownerId: 'uid-ana', title: 'Ana trip' } as never)
    await db.syncQueue.add({ entity: 'trips', entityId: 't1', op: 'put', createdAt: 1, attempts: 0 })

    // The tab was closed without signing out; someone else opens the browser.
    fb.state.currentUser = { uid: 'uid-ben', displayName: 'Ben', email: 'ben@example.com', photoURL: null }
    await firebaseAuthService.getSession()
    expect(await db.trips.count()).toBe(0)
    expect((await db.syncQueue.toArray()).map((o) => `${o.entity}/${o.entityId}`)).toEqual(['users/uid-ben']) // only Ben's own new profile
    expect(await db.users.get('uid-ben')).toBeDefined()
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
