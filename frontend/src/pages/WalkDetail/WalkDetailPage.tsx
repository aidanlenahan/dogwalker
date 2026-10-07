import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { SyncStatus } from '../../components/SyncStatus/SyncStatus'
import { useLocalWalk } from '../../hooks/useSync'
import { getWalk } from '../../services/walks'
import type { WalkDetail } from '../../types'
import {
  EVENT_LABELS,
  formatDay,
  formatDuration,
  formatTime,
  walkDurationMs,
} from '../../utils/format'

export function WalkDetailPage() {
  const { id } = useParams()
  const local = useLocalWalk(id)
  const [server, setServer] = useState<WalkDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getWalk(id)
      .then(setServer)
      .catch((e: Error) => setError(e.message))
  }, [id, local.value?.updated_at])

  // The local copy is newer until it has synced (it's removed once it has).
  const walk = local.value ?? server
  if (!walk) {
    return (
      <div className="page stack">
        {error && local.loaded ? (
          <p className="card form-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="muted">Loading…</p>
        )}
        <Link to="/walks" className="btn btn-secondary">
          All walks
        </Link>
      </div>
    )
  }

  const when = walk.started_at ?? walk.created_at
  return (
    <div className="page stack-lg">
      <div className="stack">
        <h1 className="page-title">{walk.dog.name}'s walk</h1>
        <p className="muted">
          {formatDay(when)}
          {walk.started_at && ` · ${formatTime(walk.started_at)}`}
          {walk.ended_at && ` – ${formatTime(walk.ended_at)}`}
        </p>
        <SyncStatus />
      </div>

      {walk.status === 'active' && (
        <Link to={`/walk/${walk.id}/live`} className="btn btn-primary btn-xl">
          Resume walk
        </Link>
      )}

      <dl className="stat-row">
        <div className="stat">
          <dt>Duration</dt>
          <dd>{formatDuration(walkDurationMs(walk))}</dd>
        </div>
        <div className="stat">
          <dt>Logged</dt>
          <dd>{walk.events.length}</dd>
        </div>
        <div className="stat">
          <dt>Route</dt>
          <dd>{!walk.track_gps ? 'Off' : walk.gps_mode === 'upload' ? 'GPX' : 'Live'}</dd>
        </div>
      </dl>

      {walk.pre_walk_notes && (
        <section className="stack">
          <h2 className="section-label">Pre-walk notes</h2>
          <p className="card prewrap">{walk.pre_walk_notes}</p>
        </section>
      )}

      <section className="stack">
        <h2 className="section-label">Activity</h2>
        {walk.events.length === 0 ? (
          <p className="muted">Nothing logged.</p>
        ) : (
          <ul className="list">
            {walk.events.map((e) => (
              <li key={e.id} className="list-row">
                <span className="event-time muted">{formatTime(e.timestamp)}</span>
                <span className="list-title">
                  {EVENT_LABELS[e.type]}
                  {e.notes && <span className="event-note">{e.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {walk.notes && (
        <section className="stack">
          <h2 className="section-label">Notes</h2>
          <p className="card prewrap">{walk.notes}</p>
        </section>
      )}

      {walk.status === 'completed' && (
        <p className="muted">Review, edit and sharing arrive in phase 4.</p>
      )}

      <Link to="/walks" className="btn btn-ghost">
        All walks
      </Link>
    </div>
  )
}
