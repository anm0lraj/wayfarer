import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { toast } from '@/components/feedback/toast'
import { Button } from '@/components/ui/Button'
import { useServices } from '@/services'
import type { TestPushResult } from '@/services/notifications/types'
import { PERMISSION_CHANGED } from './PushPermissionCard'

const RESULT: Record<TestPushResult, { title: string; description?: string }> = {
  sent: { title: 'Test sent', description: 'It should arrive in a few seconds. If the app is open you won’t see it pop up.' },
  no_device: { title: 'This device isn’t registered yet', description: 'Try “Register this device” first.' },
  too_soon: { title: 'One test a minute, please', description: 'Wait a moment and try again.' },
  unavailable: { title: 'Couldn’t send the test', description: 'Check your connection and try again.' },
}

/**
 * Shown once system notifications are allowed and this build can push: says whether this device is registered with the
 * server (so reminders arrive with the app closed) and lets the traveller send themselves a test.
 */
export function PushDeviceStatus() {
  const { notifications } = useServices()
  const { push } = notifications
  const [registered, setRegistered] = useState<boolean | undefined>()
  const [busy, setBusy] = useState(false)
  const [granted, setGranted] = useState(() => notifications.getPermission() === 'granted')

  useEffect(() => {
    const update = () => setGranted(notifications.getPermission() === 'granted')
    window.addEventListener(PERMISSION_CHANGED, update)
    return () => window.removeEventListener(PERMISSION_CHANGED, update)
  }, [notifications])

  useEffect(() => {
    if (push.available && granted) void push.isRegistered().then(setRegistered)
  }, [push, granted])

  if (!push.available || !granted) return null

  const register = async () => {
    setBusy(true)
    const ok = await push.register().catch(() => false)
    setRegistered(ok)
    setBusy(false)
    if (!ok) toast({ title: 'Couldn’t register this device', description: 'Reload the app once and try again. On iPhone, the app must be on your Home Screen.' })
  }
  const test = async () => {
    setBusy(true)
    toast(RESULT[await push.sendTest()])
    setBusy(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 p-4">
      <Smartphone aria-hidden className="size-5 shrink-0 text-fg-muted" />
      <p className="min-w-0 flex-1 text-fg-muted">
        {registered ? 'Reminders reach this device even when the app is closed.' : registered === false ? 'This device isn’t set up for reminders while the app is closed.' : 'Checking this device…'}
      </p>
      {registered === false && <Button size="sm" disabled={busy} onClick={() => void register()}>Register this device</Button>}
      {registered && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void test()}>Send a test</Button>}
    </div>
  )
}
