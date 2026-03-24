import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { hasPermission, type PermissionKey } from '../auth/permissions'
import { useAuth } from '../auth/useAuth'

type ProtectedRouteProps = {
  require?: PermissionKey
}

export function ProtectedRoute({ require }: ProtectedRouteProps) {
  const { token, permissions, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return <div className="route-loading">权限校验中…</div>
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (require && !hasPermission(permissions, require)) {
    return <Navigate to="/forbidden" replace state={{ from: location }} />
  }

  return <Outlet />
}
