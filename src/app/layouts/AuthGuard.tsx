import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../providers/session'

/** Requires a signed-in user; otherwise sends them to /signin and returns them here afterwards. */
export function AuthGuard() {
  const session = useSession()
  const location = useLocation()
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
