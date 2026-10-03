import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ResponsiveSheet } from '@/components/layout/ResponsiveSheet'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { env } from '@/config/env'
import { unsentWork, type UnsentWork } from '@/data/accountData'
import { sendBatch } from '@/data/remote'
import { syncNow } from '@/data/syncEngine'
import { processMemoryUploads } from '@/data/uploadQueue'
import { useServices } from '@/services'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Signing out of a real account removes that account's data from this device. First it tries to save anything still
 * waiting to be sent; if some can't be (offline, upload failed), the traveller is told exactly what would be lost and
 * chooses. On the demo backend nothing is removed, so it signs out straight away.
 */
export function useSignOut(): { signOut: () => Promise<void>; busy: boolean; dialog: ReactNode } {
  const { auth, storage } = useServices()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [unsent, setUnsent] = useState<UnsentWork | null>(null)

  const finish = async () => {
    await auth.signOut()
    if (env.backend === 'firebase') {
      qc.clear() // cached answers belong to the account that just left
      navigate('/signin', { replace: true })
    }
  }

  const signOut = async () => {
    setBusy(true)
    try {
      if (env.backend === 'firebase') {
        if (navigator.onLine) {
          await syncNow(sendBatch).catch(() => undefined)
          await processMemoryUploads(storage, { retryFailed: true }).catch(() => undefined)
        }
        const left = await unsentWork()
        if (left.changes + left.uploads > 0) return setUnsent(left)
      }
      await finish()
    } catch (e) {
      toast({ title: 'Couldn’t sign out', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  const leaveAnyway = async () => {
    setUnsent(null)
    setBusy(true)
    try { await finish() } finally { setBusy(false) }
  }

  const lost = unsent && [unsent.changes > 0 && plural(unsent.changes, 'change', 'changes'), unsent.uploads > 0 && plural(unsent.uploads, 'photo or recording', 'photos and recordings')].filter(Boolean).join(' and ')

  const dialog = (
    <ResponsiveSheet
      open={!!unsent}
      onOpenChange={(o) => { if (!o) setUnsent(null) }}
      title="Some of your work isn’t saved yet"
      description={`${lost ?? ''} couldn’t be saved to your account, usually because you’re offline. Signing out now removes ${unsent && unsent.changes + unsent.uploads === 1 ? 'it' : 'them'} from this device for good.`}
      wide="dialog"
    >
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="danger" onClick={() => void leaveAnyway()}>Sign out and lose {unsent && unsent.changes + unsent.uploads === 1 ? 'it' : 'them'}</Button>
        <Button onClick={() => setUnsent(null)}>Stay signed in</Button>
      </div>
    </ResponsiveSheet>
  )

  return { signOut, busy, dialog }
}
