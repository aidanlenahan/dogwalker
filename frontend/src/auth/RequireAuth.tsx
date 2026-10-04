import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './context'

export function RequireAuth() {
  const { state, retry } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return <div className="center-screen muted">Loading…</div>
  }
  if (state.status === 'error') {
    return (
      <div className="center-screen stack">
        <p>{state.message}</p>
        <button className="btn btn-primary" onClick={retry}>
          Try again
        </button>
      </div>
    )
  }
  if (state.status === 'signedOut') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
