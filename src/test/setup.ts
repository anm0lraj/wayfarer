import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { configure } from '@testing-library/react'
import { beforeEach } from 'vitest'

// The first screen in a test file also pays for IndexedDB seeding and lazy chunk loading; give async queries room.
configure({ asyncUtilTimeout: 6000 })
import { useToastStore } from '@/components/feedback/toast'

// Toasts live in a global store; clear it so one test's toasts (and their Undo buttons) don't leak into the next.
beforeEach(() => useToastStore.setState({ items: [] }))

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
