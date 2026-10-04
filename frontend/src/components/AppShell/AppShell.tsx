import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../auth/context'
import { DogIcon, HomeIcon, PawIcon, UserIcon } from '../icons'

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
        <button className="btn btn-ghost" onClick={onLogout} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>

      <main className="shell-main">
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
