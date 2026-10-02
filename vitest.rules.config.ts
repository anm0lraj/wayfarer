import { defineConfig } from 'vitest/config'

// Security-rule tests run against the Firestore emulator: `npm run test:rules`. Kept apart from `npm test` because they
// need Java and the emulator download.
export default defineConfig({ test: { environment: 'node', include: ['firestore-tests/**/*.test.ts'], testTimeout: 20_000, fileParallelism: false } })
