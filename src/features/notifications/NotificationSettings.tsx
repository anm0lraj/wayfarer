import { Skeleton } from '@/components/ui/Skeleton'
import { useNotificationPrefs } from '@/data/queries/notifications'
import { NOTIFICATION_TYPES } from './typeLabels'

/** One switch per notification type. Off means it is never created, in the app or on the device. */
export function NotificationSettings() {
  const { prefs, isPending, set } = useNotificationPrefs()
  if (isPending) return <Skeleton className="h-40 w-full" />
  return (
    <ul className="w-full divide-y divide-border">
      {NOTIFICATION_TYPES.map(({ type, label, description }) => {
        const on = prefs[type] ?? true
        return (
          <li key={type}>
            {/* The whole row is the label, so the small switch is never the only place to tap. */}
            <label className="flex min-h-touch cursor-pointer items-center justify-between gap-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-fg-muted">{description}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={on}
                onChange={(e) => set.mutate({ type, on: e.target.checked })}
                className="size-6 shrink-0 accent-primary"
              />
            </label>
          </li>
        )
      })}
    </ul>
  )
}
