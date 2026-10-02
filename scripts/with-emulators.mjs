// Runs a command with the Firebase emulators up: `node scripts/with-emulators.mjs <services> <vitest config>`.
// Frees the emulator ports before and after (see free-emulator-ports.mjs) and exits with the command's status.
import { spawnSync } from 'node:child_process'

const [services, config] = process.argv.slice(2)
const free = () => spawnSync(process.execPath, ['scripts/free-emulator-ports.mjs'], { stdio: 'ignore' })

free()
const { status } = spawnSync('npx', ['firebase', 'emulators:exec', '--only', services, '--project', 'demo-wayfarer', `"vitest run --config ${config}"`], { stdio: 'inherit', shell: true })
free()
process.exit(status ?? 1)
