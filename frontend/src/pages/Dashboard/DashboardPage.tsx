import { Link } from 'react-router'
import { useUser } from '../../auth/context'
import { PlusIcon } from '../../components/icons'

function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const user = useUser()

  return (
    <div className="page stack-lg">
      <h1 className="page-title">
        {greeting()}, {user.display_name}
      </h1>

      <Link to="/walk/new" className="btn btn-primary btn-xl">
        <PlusIcon className="btn-icon" />
        New walk
      </Link>

      <section className="stack">
        <h2 className="section-label">Recent walks</h2>
        <p className="card muted">No walks yet. Your finished walks will show up here.</p>
      </section>

      {/* Throwaway: the installed PWA has no URL bar. Remove with the GPS spike. */}
      <Link to="/dev/gps" className="btn btn-ghost">
        GPS test (dev)
      </Link>
    </div>
  )
}
