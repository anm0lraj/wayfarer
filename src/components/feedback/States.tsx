import { AlertTriangle, CloudOff } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Spot, type SpotArt } from '@/components/illustrations/Spot'
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

function StateShell({ visual, title, description, action, className, role, as: Heading = 'h2' }: StateProps & { visual: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div role={role} className={cn('mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      {visual}
      <Heading className="text-2xl font-extrabold">{title}</Heading>
      {description && <p className="text-pretty text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

const iconDisc = (tint: string) => cn('grid size-16 place-items-center rounded-full', tint)

/**
 * Nothing here yet — always say what to do next. A small 3D spot illustration sets the mood (`art`, default
 * suitcase): plane for flights, pin for places and maps, camera for memories, globe for discovery.
 */
export const EmptyState = ({ art = 'suitcase', ...p }: StateProps & { art?: SpotArt }) => (
  <StateShell visual={<Spot art={art} className="size-28 sm:size-32" />} {...p} />
)

/** Something failed — always offer a retry. Plain and clear: errors get an icon, not an illustration. */
export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', onRetry, ...rest }: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <StateShell
      role="alert"
      visual={<div aria-hidden className={iconDisc('bg-error/[0.12] text-error')}><AlertTriangle className="size-7" /></div>}
      title={title}
      description={description}
      action={onRetry ? <Button onClick={onRetry}>Try again</Button> : undefined}
      {...rest}
    />
  )
}

/** Shown when content needs the network and there is none. */
export const OfflineState = ({ title = 'You’re offline', description = 'This needs a connection. Your saved trips are still available.', ...rest }: Partial<StateProps>) => (
  <StateShell role="status" visual={<div aria-hidden className={iconDisc('bg-warning/[0.12] text-warning')}><CloudOff className="size-7" /></div>} title={title} description={description} {...rest} />
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
