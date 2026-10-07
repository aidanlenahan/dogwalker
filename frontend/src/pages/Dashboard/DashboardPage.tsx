import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useUser } from '../../auth/context'
import { PlusIcon } from '../../components/icons'
import { SyncStatus } from '../../components/SyncStatus/SyncStatus'
import { WalkCard } from '../../components/WalkCard/WalkCard'
import { useLocalWalks, useSyncState } from '../../hooks/useSync'
import { listWalks } from '../../services/walks'
import type { Walk, WalkListItem } from '../../types'
import { formatElapsed, walkDurationMs } from '../../utils/format'

const RECENT = 5

function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const user = useUser()
  const local = useLocalWalks()
  const { pending } = useSyncState()
  const [server, setServer] = useState<WalkListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  // Refetch after queued writes land so new walks show up from the server.
  useEffect(() => {
    listWalks({ limit: RECENT + 5 })
      .then((w) => {
        setServer(w)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [pending])

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Local copies win: they're this device's latest state.
  const byId = new Map<string, { walk: Walk; events: number; unsynced: boolean }>()
  for (const w of server ?? []) byId.set(w.id, { walk: w, events: w.event_count, unsynced: false })
  for (const w of local) byId.set(w.id, { walk: w, events: w.events.length, unsynced: true })
  const all = [...byId.values()]
  const active = all.filter((x) => x.walk.status === 'active')
  const recent = all
    .filter((x) => x.walk.status === 'completed' || x.walk.status === 'published')
    .sort((a, b) => (b.walk.started_at ?? '').localeCompare(a.walk.started_at ?? ''))
    .slice(0, RECENT)

  return (
    <div className="page stack-lg">
      <h1 className="page-title">
        {greeting()}, {user.display_name}
      </h1>

      {active.map(({ walk, events }) => (
        <section key={walk.id} className="card active-card stack" aria-label="Active walk">
          <h2 className="section-label">Active walk</h2>
          <p className="active-card-dog">{walk.dog.name}</p>
          <p className="muted">
            {formatElapsed(walkDurationMs(walk))}
            {events > 0 && ` · ${events} logged`}
          </p>
          <Link to={`/walk/${walk.id}/live`} className="btn btn-primary btn-lg">
            Resume
          </Link>
        </section>
      ))}

      <Link
        to="/walk/new"
        className={`btn btn-xl ${active.length ? 'btn-secondary' : 'btn-primary'}`}
      >
        <PlusIcon className="btn-icon" />
        New walk
      </Link>

      <SyncStatus />

      <section className="stack">
        <h2 className="section-label">Recent walks</h2>
        {error && !server && <p className="card form-error">{error}</p>}
        {server && recent.length === 0 && (
          <p className="card muted">No walks yet. Your finished walks will show up here.</p>
        )}
        {recent.length > 0 && (
          <ul className="list">
            {recent.map(({ walk, events, unsynced }) => (
              <li key={walk.id}>
                <WalkCard walk={walk} eventCount={events} unsynced={unsynced} />
              </li>
            ))}
          </ul>
        )}
        {recent.length > 0 && (
          <Link to="/walks" className="btn btn-ghost">
            See all walks
          </Link>
        )}
      </section>

      {/* Throwaway: the installed PWA has no URL bar. Remove with the GPS spike. */}
      <Link to="/dev/gps" className="btn btn-ghost">
        GPS test (dev)
      </Link>
    </div>
  )
}
