import { Link } from 'react-router'
import type { Walk } from '../../types'
import { formatDay, formatDuration, walkDurationMs } from '../../utils/format'

export function WalkCard({
  walk,
  eventCount,
  unsynced = false,
}: {
  walk: Walk
  eventCount: number
  unsynced?: boolean
}) {
  const when = walk.started_at ?? walk.created_at
  return (
    <Link to={`/walk/${walk.id}`} className="list-row walk-card">
      <span className="stack-xs">
        <span className="list-title">{walk.dog.name}</span>
        <span className="muted">
          {formatDay(when)} · {formatDuration(walkDurationMs(walk))}
          {eventCount > 0 && ` · ${eventCount} logged`}
        </span>
      </span>
      {unsynced && <span className="badge">Not synced</span>}
      {walk.status === 'published' && <span className="badge">Shared</span>}
    </Link>
  )
}
