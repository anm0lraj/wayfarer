import { useRouteError } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/States'

export function RouteError() {
  const error = useRouteError()
  return <ErrorState title="This screen failed to load" description={error instanceof Error ? error.message : undefined} onRetry={() => location.reload()} />
}
