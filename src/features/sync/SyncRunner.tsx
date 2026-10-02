import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/providers/session'
import { toast } from '@/components/feedback/toast'
import { pullRemote, sendBatch } from '@/data/remote'
import { syncNow } from '@/data/syncEngine'
import { useOnline } from '@/lib/hooks/useOnline'
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

  useEffect(() => {
    if (!online) return
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      useSyncState.setState({ syncing: true })
      const result = await syncNow(sendBatch)
      const { conflicts } = result
      let { failed } = result
      if (uid && !failed && (lastPull.current.uid !== uid || Date.now() - lastPull.current.at > PULL_EVERY_MS)) {
        lastPull.current = { uid, at: Date.now() }
        try {
          if ((await pullRemote(uid)) > 0 && !cancelled) void qc.invalidateQueries()
        } catch {
          failed = true
        }
      }
      useSyncState.setState({ syncing: false, lastFailed: failed })
      if (conflicts > 0 && !cancelled) {
        void qc.invalidateQueries()
        toast({ title: `${conflicts} ${conflicts === 1 ? 'change was' : 'changes were'} replaced by a newer version`, description: 'Another device edited the same thing more recently, so we kept that one.' })
      }
    }
    const soon = setTimeout(() => void run(), pending > 0 ? 400 : 0)
    const every = setInterval(() => void run(), 30_000)
    return () => { cancelled = true; clearTimeout(soon); clearInterval(every) }
  }, [online, pending, qc, uid])

  return null
}
