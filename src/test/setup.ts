import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { configure } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'

// The first screen in a test file also pays for IndexedDB seeding and lazy chunk loading; give async queries room.
configure({ asyncUtilTimeout: 6000 })
import { useToastStore } from '@/components/feedback/toast'
import { routeState } from '@/app/layouts/routeState'

// Pin the clock to before the seeded Bali trip (12-17 Oct 2026) so date-dependent tests don't change with the real
// date. Only `Date` is faked and it keeps advancing; timers stay real. Vitest ignores a second `useFakeTimers` while
// one is installed, so a test that fakes timers itself must call `vi.useRealTimers()` first (and the pin is reset
// before the next test).
const TEST_NOW = new Date('2026-10-01T09:00:00+05:30')
beforeEach(() => {
  vi.useRealTimers()
  vi.useFakeTimers({ toFake: ['Date'], now: TEST_NOW, shouldAdvanceTime: true })
})

// Toasts live in a global store; clear it so one test's toasts (and their Undo buttons) don't leak into the next.
beforeEach(() => {
  useToastStore.setState({ items: [] })
  routeState.lastKey = null // each test is a fresh session
})

// jsdom has no matchMedia; report "no match" for everything, i.e. the phone layout and light mode.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom has no ResizeObserver (the map and some Radix parts use it).
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }

// jsdom doesn't implement these, and Radix (Tabs, Dialog) calls them on pointer events.
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}

// jsdom has no object URLs (used for photo previews and stored media).
URL.createObjectURL ??= () => `blob:test/${Math.random().toString(36).slice(2)}`
URL.revokeObjectURL ??= () => {}
