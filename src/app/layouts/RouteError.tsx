import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { ErrorState } from '@/components/feedback/States'
import { reportError } from '@/lib/monitoring'

export function RouteError() {
  const error = useRouteError()
  useEffect(() => reportError(error), [error]) // a screen that failed to load is a bug worth hearing about
  return <ErrorState as="h1" title="This screen failed to load" description={error instanceof Error ? error.message : undefined} onRetry={() => location.reload()} />
}
