import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/providers/session'
import { toast } from '@/components/feedback/toast'
import { pullRemote, sendBatch } from '@/data/remote'
import { syncNow } from '@/data/syncEngine'
import { useOnline } from '@/lib/hooks/useOnline'
import { describeError, serialRun } from './serialRun'
import { usePendingChanges, useSyncState } from './useSyncStatus'

/** Remote changes are fetched on load, on reconnect, and then every few minutes; local edits are sent much sooner. */
const PULL_EVERY_MS = 150_000

/**
 * Sends queued local edits whenever we're online: on load, when connectivity returns, shortly after a new
 * edit, and every 30 s as a safety net. It also brings remote changes down (real backend only). Renders nothing.
 * Local data is always the source the UI reads from, so a slow or failed sync never blocks editing.
 */
export function SyncRunner() {
  const online = useOnline()
  const pending = usePendingChanges()
  const qc = useQueryClient()
  const uid = useSession()?.user.id
  const lastPull = useRef({ uid: '', at: 0 }) // survives the effect re-running after every edit, so edits don't each trigger a download

  // Latest values for the pass below, which outlives a single render.
  const latest = useRef({ uid, qc })
  latest.current = { uid, qc }

  /** One pass: send the queue, then download if it is time. Throws only on something unexpected (a bug, a broken database). */
  const pass = useRef(async () => {
    const { uid, qc } = latest.current
    const result = await syncNow(sendBatch)
    const { conflicts } = result
    let { failed } = result
    let error = result.error
    if (uid && !failed && (lastPull.current.uid !== uid || Date.now() - lastPull.current.at > PULL_EVERY_MS)) {
      lastPull.current = { uid, at: Date.now() }
      try {
        if ((await pullRemote(uid)) > 0) void qc.invalidateQueries()
      } catch (err) {
        failed = true
        error = describeError(err)
      }
    }
    const stuck = failed || !!result.refused // refused changes stay queued: say so, but keep pulling
    useSyncState.setState({ lastFailed: stuck, lastError: stuck ? error : undefined, lastSyncedAt: failed ? useSyncState.getState().lastSyncedAt : Date.now() })
    if (conflicts > 0) {
      void qc.invalidateQueries()
      toast({ title: `${conflicts} ${conflicts === 1 ? 'change was' : 'changes were'} replaced by a newer version`, description: 'Another device edited the same thing more recently, so we kept that one.' })
    }
  })
  const run = useRef(serialRun(() => pass.current())).current

  useEffect(() => {
    if (!online) return
    const soon = setTimeout(() => void run(), pending > 0 ? 400 : 0)
    const every = setInterval(() => void run(), 30_000)
    return () => { clearTimeout(soon); clearInterval(every) }
  }, [online, pending, run])

  return null
}
