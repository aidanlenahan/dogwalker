import { useEffect, useState } from 'react'
import { WalkCard } from '../../components/WalkCard/WalkCard'
import { useLocalWalks } from '../../hooks/useSync'
import { listWalks } from '../../services/walks'
import type { WalkListItem } from '../../types'

const PAGE = 20

export function WalksPage() {
  const local = useLocalWalks()
  const [walks, setWalks] = useState<WalkListItem[]>([])
  const [more, setMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load(offset: number) {
    return listWalks({ limit: PAGE, offset })
      .then((page) => {
        setWalks((prev) => (offset ? [...prev, ...page] : page))
        setMore(page.length === PAGE)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    void load(0)
  }, [])

  function loadMore() {
    setLoading(true)
    setError(null)
    void load(walks.length)
  }

  const serverIds = new Set(walks.map((w) => w.id))
  const unsynced = local.filter((w) => !serverIds.has(w.id))

  return (
    <div className="page stack-lg">
      <h1 className="page-title">Walks</h1>
      {error && (
        <p className="card form-error" role="alert">
          {error}
        </p>
      )}
      {walks.length === 0 && unsynced.length === 0 && !loading && !error && (
        <p className="card muted">No walks yet.</p>
      )}
      <ul className="list">
        {unsynced.map((w) => (
          <li key={w.id}>
            <WalkCard walk={w} eventCount={w.events.length} unsynced />
          </li>
        ))}
        {walks.map((w) => (
          <li key={w.id}>
            <WalkCard walk={w} eventCount={w.event_count} />
          </li>
        ))}
      </ul>
      {loading && <p className="muted">Loading…</p>}
      {more && !loading && walks.length > 0 && (
        <button className="btn btn-secondary" onClick={loadMore}>
          Load more
        </button>
      )}
    </div>
  )
}
