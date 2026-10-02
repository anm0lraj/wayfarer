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
          <li key={type} className="flex items-center justify-between gap-4 py-3">
            <label htmlFor={`pref-${type}`} className="min-w-0 flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block text-sm text-fg-muted">{description}</span>
            </label>
            <input
              id={`pref-${type}`}
              type="checkbox"
              role="switch"
              checked={on}
              onChange={(e) => set.mutate({ type, on: e.target.checked })}
              className="size-6 shrink-0 accent-primary"
            />
          </li>
        )
      })}
    </ul>
  )
}
