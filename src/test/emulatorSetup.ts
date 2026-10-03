import 'fake-indexeddb/auto'
import { webcrypto } from 'node:crypto'

// Node 18 has no global `crypto` unless started with a flag; the code under test uses crypto.randomUUID().
if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
