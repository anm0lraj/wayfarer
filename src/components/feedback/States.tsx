import { AlertTriangle, CloudOff, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { useOnline } from '@/lib/hooks/useOnline'
import { cn } from '@/lib/cn'

interface StateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Heading level. Use 'h1' when the state is the whole page (nothing else on it names the page). */
  as?: 'h1' | 'h2'
}

function StateShell({ icon, title, description, action, className, role, as: Heading = 'h2' }: StateProps & { icon: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div role={role} className={cn('mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <div aria-hidden className="grid size-14 place-items-center rounded-full bg-surface-2 text-fg-muted">{icon}</div>
      <Heading className="text-xl font-semibold">{title}</Heading>
      {description && <p className="text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/** Nothing here yet — always say what to do next. */
export const EmptyState = (p: StateProps) => <StateShell icon={<Inbox className="size-7" />} {...p} />

/** Something failed — always offer a retry. */
export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', onRetry, ...rest }: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <StateShell
      role="alert"
      icon={<AlertTriangle className="size-7 text-error" />}
      title={title}
      description={description}
      action={onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined}
      {...rest}
    />
  )
}

/** Shown when content needs the network and there is none. */
export const OfflineState = ({ title = 'You’re offline', description = 'This needs a connection. Your saved trips are still available.', ...rest }: Partial<StateProps>) => (
  <StateShell role="status" icon={<CloudOff className="size-7" />} title={title} description={description} {...rest} />
)

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-medium text-warning-fg">
      <CloudOff aria-hidden className="size-4" /> Offline mode — changes are saved on this device and will sync when you’re back online.
    </div>
  )
}
