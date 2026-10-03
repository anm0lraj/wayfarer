import { useState } from 'react'
import { BellRing, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useServices } from '@/services'
import type { PushPermission } from '@/services/notifications/types'

/** Fired after the permission prompt is answered, so other parts of the screen (the device status) can update. */
export const PERMISSION_CHANGED = 'wayfarer:notification-permission'

/**
 * Asks to show system notifications — but only after explaining what they're for, and only when the
 * traveller presses the button. Never rendered on first load; it appears after a relevant action
 * (creating a trip), in the notification centre, and in Settings. In-app notifications work regardless.
 */
export function PushPermissionCard({ onDone }: { onDone?: () => void }) {
  const { notifications } = useServices()
  const [permission, setPermission] = useState<PushPermission>(() => notifications.getPermission())
  const [dismissed, setDismissed] = useState(false)

  if (permission === 'granted' || dismissed) return null
  if (permission === 'unsupported') {
    return (
      <Card className="flex items-start gap-3 p-4">
        <BellOff aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-muted" />
        <p className="text-fg-muted">This browser can’t show system notifications. Reminders still appear here in the app. On iPhone, add the app to your Home Screen first.</p>
      </Card>
    )
  }
  if (permission === 'denied') {
    return (
      <Card className="flex items-start gap-3 p-4">
        <BellOff aria-hidden className="mt-0.5 size-5 shrink-0 text-fg-muted" />
        <p className="text-fg-muted">System notifications are blocked for this site. You’ll still see reminders in the app. To get them on your device, allow notifications in your browser’s site settings.</p>
      </Card>
    )
  }
  return (
    <Card className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><BellRing aria-hidden className="size-5" /> Get reminders on your device?</h2>
      <p className="text-fg-muted">We can nudge you about your trip countdown, hotel check-in, and when your next activity is about to start. You choose which kinds in Settings, and we keep them few.</p>
      <div className="flex gap-2">
        <Button onClick={async () => { setPermission(await notifications.requestPermission()); window.dispatchEvent(new Event(PERMISSION_CHANGED)); onDone?.() }}>Turn on notifications</Button>
        <Button variant="ghost" onClick={() => { setDismissed(true); onDone?.() }}>Not now</Button>
      </div>
    </Card>
  )
}
