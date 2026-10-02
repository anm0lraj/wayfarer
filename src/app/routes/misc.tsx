import { Link, useLocation, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { useServices } from '@/services'

export function NotFound() {
  return (
    <EmptyState as="h1"
      title="We can’t find that page"
      description="The link may be old, or the trip may have been deleted."
      action={<Button asChild><Link to="/">Go home</Link></Button>}
    />
  )
}

export function SignIn() {
  const { auth } = useServices()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="text-3xl font-bold">Welcome to Wayfarer</h1>
      <p className="mt-2 text-fg-muted">Plan your journey. Experience it. Capture it. Share it.</p>
      <div className="mt-8 flex flex-col gap-3">
        <Button size="lg" onClick={async () => { await auth.signIn('demo'); navigate(from, { replace: true }) }}>Continue as demo traveller</Button>
        <Button size="lg" variant="secondary" asChild><Link to="/explore">Browse public itineraries</Link></Button>
      </div>
      <p className="mt-6 text-sm text-fg-muted">Demo mode: no real account is created and nothing leaves this device.</p>
    </div>
  )
}
