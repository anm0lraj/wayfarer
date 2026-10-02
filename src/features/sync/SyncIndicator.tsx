import { CloudUpload } from 'lucide-react'
import { useOnline } from '@/lib/hooks/useOnline'
import { usePendingChanges, useSyncState } from './useSyncStatus'

/** Small header chip: only appears while local changes are waiting, so it is quiet when everything is saved. */
export function SyncIndicator() {
  const pending = usePendingChanges()
  const online = useOnline()
  const { syncing, lastFailed } = useSyncState()
  if (pending === 0) return null
  const label = !online ? `${pending} changes saved on this device, waiting for a connection` : lastFailed ? `${pending} changes couldn’t sync yet; will retry` : syncing ? `Syncing ${pending} changes` : `${pending} changes waiting to sync`
  return (
    <span role="status" aria-label={label} title={label} className="grid min-h-touch min-w-touch place-items-center text-fg-muted">
      <span className="relative">
        <CloudUpload aria-hidden className={`size-5 ${syncing ? 'motion-safe:animate-pulse' : ''}`} />
        <span aria-hidden className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-4 text-secondary-fg">{pending > 99 ? '99+' : pending}</span>
      </span>
    </span>
  )
}
