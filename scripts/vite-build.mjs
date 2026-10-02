// Runs `vite build`. On Node < 19 the global Web Crypto API (which workbox's build tooling expects in its
// worker threads) is behind a flag, so pass it. On Node ≥ 19 this behaves exactly like `vite build`.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const major = Number(process.versions.node.split('.')[0])
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const nodeArgs = major < 19 ? ['--experimental-global-webcrypto'] : []

const { status } = spawnSync(process.execPath, [...nodeArgs, viteBin, 'build', ...process.argv.slice(2)], { stdio: 'inherit' })
process.exit(status ?? 1)
