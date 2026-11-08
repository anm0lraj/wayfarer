import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'

// Node 18 has no global `crypto` unless started with a flag; the code under test uses crypto.randomUUID().
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto })

// Node 21+ has a global `navigator` without `onLine`, which the sync engine would read as offline.
if (typeof navigator !== 'undefined' && navigator.onLine === undefined) Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
