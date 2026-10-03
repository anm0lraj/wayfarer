// On Windows `firebase emulators:exec` can leave emulator processes running after it finishes (the Firestore emulator's
// Java process, the Storage emulator's Node process), which blocks the next run ("port taken"). Stop whatever still
// listens on the emulator ports, but only if it is clearly the emulator: Java, or Node started by the Firebase CLI.
// No-op elsewhere.
import { execSync } from 'node:child_process'

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

function isEmulator(pid) {
  const name = sh(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`)
  if (/java/i.test(name)) return true
  if (!/node/i.test(name)) return false
  try {
    return /firebase/i.test(sh(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`))
  } catch {
    return false
  }
}

if (process.platform === 'win32') {
  for (const port of [8080, 9099, 9199, 4400, 4500, 9150]) {
    try {
      const out = sh(`netstat -ano -p tcp | findstr :${port} | findstr LISTENING`)
      for (const pid of new Set(out.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && /^\d+$/.test(p) && p !== '0'))) {
        if (isEmulator(pid)) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      }
    } catch { /* nothing listening on this port */ }
  }
}
