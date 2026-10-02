import { create } from 'zustand'

/** The browser's install prompt event (not in the TS DOM lib). */
export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaState {
  /** A new version has been downloaded and is waiting. */
  needRefresh: boolean
  /** Everything is cached for offline use (first install only). */
  offlineReady: boolean
  installEvent: InstallPromptEvent | null
  installed: boolean
  applyUpdate?: () => Promise<void>
  dismissUpdate: () => void
}

export const usePwa = create<PwaState>((set) => ({
  needRefresh: false,
  offlineReady: false,
  installEvent: null,
  installed: typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches,
  dismissUpdate: () => set({ needRefresh: false }),
}))

/** Listens for the install prompt. Chrome/Edge/Android only; Safari has no event, so the UI explains Add to Home Screen instead. */
export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep it for a button in Settings instead of the browser's own mini-bar
    usePwa.setState({ installEvent: e as InstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => usePwa.setState({ installed: true, installEvent: null }))
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ev = usePwa.getState().installEvent
  if (!ev) return 'unavailable'
  await ev.prompt()
  const { outcome } = await ev.userChoice
  usePwa.setState({ installEvent: null })
  return outcome
}
