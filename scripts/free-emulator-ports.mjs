// On Windows `firebase emulators:exec` can leave the Firestore emulator's Java process running after it finishes,
// which blocks the next run ("port taken"). Stop whatever still listens on the emulator ports. No-op elsewhere.
import { execSync } from 'node:child_process'

if (process.platform === 'win32') {
  for (const port of [8080, 9099, 4400, 4500, 9150]) {
    try {
      const out = execSync(`netstat -ano -p tcp | findstr :${port} | findstr LISTENING`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      for (const pid of new Set(out.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && /^\d+$/.test(p) && p !== '0'))) {
        const name = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' })
        if (/java/i.test(name)) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      }
    } catch { /* nothing listening on this port */ }
  }
}
