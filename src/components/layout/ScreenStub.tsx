import { useLocation, useParams } from 'react-router-dom'
import { PageHeader } from './PageHeader'
import { EmptyState } from '@/components/feedback/States'
import { Badge } from '@/components/ui/Chip'

/**
 * Routed placeholder for a screen that lands in a later phase. It is a real, linkable route with a proper
 * heading and an honest empty state — not a blank page — and shows the route params it will receive.
 */
export function ScreenStub({ title, phase, spec, description }: { title: string; phase: number; spec: string; description?: string }) {
  const params = useParams()
  const { pathname, search } = useLocation()
  const entries = Object.entries(params).filter(([k]) => k !== '*')
  return (
    <>
      <PageHeader title={title} actions={<Badge tone="warning">Phase {phase}</Badge>} />
      <EmptyState
        title={`${title} arrives in Phase ${phase}`}
        description={description ?? `This route is wired up and ready. The screen itself is specified in ${spec}.`}
        action={
          <p className="rounded-md bg-surface-2 px-3 py-2 font-mono text-sm text-fg-muted">
            {pathname}{search}{entries.length ? `  ·  ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}` : ''}
          </p>
        }
      />
    </>
  )
}
