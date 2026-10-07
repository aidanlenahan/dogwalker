import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/context'
import { DogIcon, HomeIcon, PawIcon, SettingsIcon, UserIcon } from '../icons'
import { NotificationNudge } from '../NotificationNudge/NotificationNudge'

const NAV = [
  { to: '/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/dogs', label: 'Dogs', Icon: DogIcon },
  { to: '/profile/edit', label: 'Profile', Icon: UserIcon },
]

/** Signed-in layout: slim header, content, thumb-reachable bottom nav. */
export function AppShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function onLogout() {
    setSigningOut(true)
    await logout().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <span className="brand">
          <PawIcon className="brand-icon" />
          Dogwalker
        </span>
        <div className="shell-actions">
          <Link to="/settings" className="icon-btn" aria-label="Settings">
            <SettingsIcon />
          </Link>
          <button className="btn btn-ghost" onClick={onLogout} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <main className="shell-main">
        <NotificationNudge />
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="tab">
            <Icon className="tab-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
