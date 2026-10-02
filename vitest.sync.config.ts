import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Sync tests talk to the real Firestore + Auth emulators: `npm run test:sync`. They run in plain Node (IndexedDB comes
// from fake-indexeddb) and are kept out of `npm test` because they need Java and the emulator download.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', setupFiles: ['fake-indexeddb/auto'], include: ['src/**/*.emu.test.ts'], testTimeout: 30_000, fileParallelism: false },
})
