import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePwa } from '@/lib/pwa'

/** Shown when a new version of the app has been downloaded. Reloading is the user's call, so edits are never lost. */
export function UpdateBanner() {
  const { needRefresh, applyUpdate, dismissUpdate } = usePwa()
  if (!needRefresh) return null
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 bg-primary px-4 py-1.5 text-sm font-medium text-primary-fg">
      <span className="inline-flex items-center gap-2"><RefreshCw aria-hidden className="size-4" /> A new version of Wayfarer is ready.</span>
      <Button size="sm" variant="ghost" className="text-primary-fg underline hover:bg-white/10" onClick={() => void applyUpdate?.()}>Reload to update</Button>
      <Button size="sm" variant="ghost" className="text-primary-fg hover:bg-white/10" onClick={dismissUpdate}>Later</Button>
    </div>
  )
}
