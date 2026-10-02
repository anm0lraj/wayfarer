import { create } from 'zustand'

export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'theme'
const mq = () => matchMedia('(prefers-color-scheme: dark)')

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && mq().matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0f14' : '#0e7490')
}

interface ThemeState {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

export const useTheme = create<ThemeState>((set) => ({
  preference: read(),
  setPreference: (preference) => {
    try { localStorage.setItem(KEY, preference) } catch { /* private mode: still apply for this session */ }
    applyTheme(preference)
    set({ preference })
  },
}))

/** Call once at startup: applies the stored theme and follows the OS setting while preference is "system". */
export function initTheme() {
  applyTheme(useTheme.getState().preference)
  mq().addEventListener('change', () => {
    if (useTheme.getState().preference === 'system') applyTheme('system')
  })
}
