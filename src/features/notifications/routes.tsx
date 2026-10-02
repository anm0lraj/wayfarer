import { Link } from 'react-router-dom'
import { Bell, CalendarClock, CloudRain, Hotel, Hourglass, Route, type LucideIcon } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/feedback/States'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton'
import { useNotificationActions, useNotifications } from '@/data/queries/notifications'
import { cn } from '@/lib/cn'
import type { Notification, NotificationType } from '@/types'
import { PushPermissionCard } from './PushPermissionCard'

const ICONS: Record<NotificationType, LucideIcon> = {
  trip_countdown: CalendarClock, checkin_reminder: Hotel, weather_alert: CloudRain, next_activity: Route, free_time: Hourglass, busy_day: Bell,
}

function timeLabel(n: Notification) {
  return new Date(n.scheduledFor).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/** `/notifications` — the in-app centre. It always works, even where web push doesn't. */
export function NotificationsRoute() {
  const { data, isPending, isError, refetch } = useNotifications()
  const { markRead, markAllRead } = useNotificationActions()
  const unread = data?.filter((n) => !n.readAt).length ?? 0

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : undefined}
        actions={
          <>
            <Button variant="secondary" size="sm" disabled={!unread} onClick={() => markAllRead.mutate()}>Mark all read</Button>
            <Button asChild variant="ghost" size="sm"><Link to="/settings#notifications">Settings</Link></Button>
          </>
        }
      />
      <div className="mx-auto max-w-2xl space-y-4">
        <PushPermissionCard />
        {isPending && (
          <SkeletonGroup label="Loading notifications" className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </SkeletonGroup>
        )}
        {isError && <ErrorState title="Couldn’t load notifications" onRetry={() => void refetch()} />}
        {data && data.length === 0 && (
          <EmptyState title="Nothing yet" description="Reminders about your trips will show up here: countdowns, check-ins and what’s coming next." action={<Button asChild><Link to="/trips">Go to your trips</Link></Button>} />
        )}
        {data && data.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {data.map((n) => {
              const Icon = ICONS[n.type]
              return (
                <li key={n.id}>
                  <Link
                    to={n.deepLink}
                    onClick={() => !n.readAt && markRead.mutate(n.id)}
                    className={cn('flex min-h-touch items-start gap-3 px-4 py-3 hover:bg-surface-2', !n.readAt && 'bg-primary/5')}
                  >
                    <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2"><Icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block', !n.readAt && 'font-semibold')}>{n.title}{!n.readAt && <span className="sr-only"> (unread)</span>}</span>
                      <span className="block text-fg-muted">{n.body}</span>
                      <span className="mt-0.5 block text-sm text-fg-muted">{timeLabel(n)}</span>
                    </span>
                    {!n.readAt && <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

export default NotificationsRoute
