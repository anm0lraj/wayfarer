import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/feedback/toast'
import { syncNow } from '@/data/syncEngine'
import { useOnline } from '@/lib/hooks/useOnline'
import { usePendingChanges, useSyncState } from './useSyncStatus'

/**
 * Sends queued local edits whenever we're online: on load, when connectivity returns, shortly after a new
 * edit, and every 30 s as a safety net. Renders nothing. Local data is always the source the UI reads from,
 * so a slow or failed sync never blocks editing.
 */
export function SyncRunner() {
  const online = useOnline()
  const pending = usePendingChanges()
  const qc = useQueryClient()

  useEffect(() => {
    if (!online) return
    let cancelled = false
    const run = async () => {
      if (cancelled) return
      useSyncState.setState({ syncing: true })
      const { conflicts, failed } = await syncNow()
      useSyncState.setState({ syncing: false, lastFailed: failed })
      if (conflicts > 0 && !cancelled) {
        void qc.invalidateQueries()
        toast({ title: `${conflicts} ${conflicts === 1 ? 'change was' : 'changes were'} replaced by a newer version`, description: 'Another device edited the same thing more recently, so we kept that one.' })
      }
    }
    const soon = setTimeout(() => void run(), pending > 0 ? 400 : 0)
    const every = setInterval(() => void run(), 30_000)
    return () => { cancelled = true; clearTimeout(soon); clearInterval(every) }
  }, [online, pending, qc])

  return null
}
