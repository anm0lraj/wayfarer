import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { processMemoryUploads } from '@/data/uploadQueue'
import { announce } from '@/lib/a11y/announce'
import { useOnline } from '@/lib/hooks/useOnline'
import { useServices } from '@/services'

/**
 * Drains the memory upload queue: on load, whenever connectivity returns, and every 30 s while online (to
 * pick up anything queued in another tab). Mounted once in the app shell; renders nothing.
 */
export function UploadRunner() {
  const { storage } = useServices()
  const qc = useQueryClient()
  const online = useOnline()

  useEffect(() => {
    if (!online) return
    let cancelled = false
    const run = async () => {
      const { uploaded } = await processMemoryUploads(storage)
      if (cancelled || uploaded === 0) return
      await qc.invalidateQueries({ queryKey: ['memories'] })
      announce(uploaded === 1 ? 'Memory uploaded' : `${uploaded} memories uploaded`)
    }
    void run()
    const id = setInterval(() => void run(), 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [online, storage, qc])

  return null
}
