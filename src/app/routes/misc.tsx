import { Link, useLocation, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/feedback/States'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/feedback/toast'
import { env } from '@/config/env'
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
  const signIn = async (provider: 'demo' | 'google') => {
    try {
      await auth.signIn(provider)
      navigate(from, { replace: true })
    } catch (e) {
      toast({ title: 'Couldn’t sign you in', description: e instanceof Error ? e.message : undefined })
    }
  }
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="text-3xl font-bold">Welcome to Wayfarer</h1>
      <p className="mt-2 text-fg-muted">Plan your journey. Experience it. Capture it. Share it.</p>
      <div className="mt-8 flex flex-col gap-3">
        {env.backend === 'firebase' ? (
          <Button size="lg" onClick={() => void signIn('google')}>Continue with Google</Button>
        ) : (
          <Button size="lg" onClick={() => void signIn('demo')}>Continue as demo traveller</Button>
        )}
        <Button size="lg" variant="secondary" asChild><Link to="/explore">Browse public itineraries</Link></Button>
      </div>
      <p className="mt-6 text-sm text-fg-muted">{env.backend === 'firebase' ? 'Your trips are saved to your account and kept on this device so they work offline.' : 'Demo mode: no real account is created and nothing leaves this device.'}</p>
    </div>
  )
}
