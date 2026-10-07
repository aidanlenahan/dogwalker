import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { SyncStatus } from '../../components/SyncStatus/SyncStatus'
import { useLocalWalk } from '../../hooks/useSync'
import {
  adoptWalk,
  discardWalk,
  finishWalk,
  logEvent,
  removeEvent,
} from '../../services/activeWalk'
import { ApiError } from '../../services/api'
import { getWalk } from '../../services/walks'
import type { EventType } from '../../types'
import { EVENT_LABELS, formatElapsed, formatTime } from '../../utils/format'

const QUICK_LOG: EventType[] = ['pee', 'poop', 'water', 'fed']

export function ActiveWalkPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { value: walk, loaded } = useLocalWalk(id)
  const [missing, setMissing] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justLogged, setJustLogged] = useState<string | null>(null)

  // Not on this device: pick it up from the server if it's still active.
  useEffect(() => {
    if (!loaded || walk || !id) return
    getWalk(id)
      .then((w) => {
        if (w.status === 'active') return adoptWalk(w)
        navigate(`/walk/${id}`, { replace: true })
      })
      .catch((e: Error) =>
        setMissing(
          e instanceof ApiError && e.status === 404
            ? "This walk doesn't exist."
            : `Couldn't load this walk: ${e.message}`,
        ),
      )
  }, [loaded, walk, id, navigate])

  useEffect(() => {
    if (walk?.status === 'completed') navigate(`/walk/${walk.id}`, { replace: true })
  }, [walk?.status, walk?.id, navigate])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!justLogged) return
    const t = setTimeout(() => setJustLogged(null), 1500)
    return () => clearTimeout(t)
  }, [justLogged])

  async function act(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const log = (type: EventType, notes?: string) =>
    act(async () => {
      const event = await logEvent(walk!.id, type, notes)
      setJustLogged(event.id)
    })

  function onNote(e: FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    void log('note', note)
    setNote('')
    setNoteOpen(false)
  }

  async function onFinish() {
    if (!confirm('Finish this walk?')) return
    setBusy(true)
    await act(async () => {
      await finishWalk(walk!.id)
      navigate(`/walk/${walk!.id}`, { replace: true })
    })
    setBusy(false)
  }

  async function onDiscard() {
    if (!confirm('Discard this walk? Its activity log will be deleted.')) return
    setBusy(true)
    await act(async () => {
      await discardWalk(walk!.id)
      navigate('/dashboard', { replace: true })
    })
    setBusy(false)
  }

  if (!walk) {
    return (
      <div className="page stack">
        {missing ? (
          <p className="card form-error" role="alert">
            {missing}
          </p>
        ) : (
          <p className="muted">Loading…</p>
        )}
        <Link to="/dashboard" className="btn btn-secondary">
          Back to home
        </Link>
      </div>
    )
  }

  const events = [...walk.events].reverse()

  return (
    <div className="page stack-lg active-walk">
      <header className="stack active-walk-head">
        <h1 className="section-label">{walk.dog.name}'s walk</h1>
        <p className="elapsed" aria-label="Elapsed time">
          {formatElapsed(now - new Date(walk.started_at!).getTime())}
        </p>
        {walk.track_gps && (
          <p className="muted">
            {walk.gps_mode === 'upload'
              ? 'Route: recording on another device. Upload the GPX after the walk.'
              : 'Live GPS route coming in phase 5.'}
          </p>
        )}
        <SyncStatus />
      </header>

      {error && (
        <p className="card form-error" role="alert">
          {error}
        </p>
      )}

      {walk.track_activity && (
        <section className="stack">
          <h2 className="section-label">Quick log</h2>
          <div className="quick-log">
            {QUICK_LOG.map((type) => (
              <button key={type} className="btn btn-secondary btn-lg" onClick={() => log(type)}>
                {EVENT_LABELS[type]}
              </button>
            ))}
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => setNoteOpen((o) => !o)}
              aria-expanded={noteOpen}
            >
              Note
            </button>
          </div>
          {noteOpen && (
            <form className="card stack" onSubmit={onNote}>
              <label className="field">
                Note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  autoFocus
                />
              </label>
              <button className="btn btn-primary" disabled={!note.trim()}>
                Save note
              </button>
            </form>
          )}
        </section>
      )}

      <section className="stack">
        <h2 className="section-label">Recent activity</h2>
        {events.length === 0 ? (
          <p className="muted">Nothing logged yet.</p>
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} className={`list-row${e.id === justLogged ? ' just-logged' : ''}`}>
                <span className="event-time muted">{formatTime(e.timestamp)}</span>
                <span className="list-title">
                  {EVENT_LABELS[e.type]}
                  {e.notes && <span className="event-note">{e.notes}</span>}
                </span>
                <button
                  className="row-action"
                  aria-label={`Delete ${EVENT_LABELS[e.type]} at ${formatTime(e.timestamp)}`}
                  onClick={() => act(() => removeEvent(walk.id, e.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button className="btn btn-primary btn-xl finish-btn" onClick={onFinish} disabled={busy}>
        Finish walk
      </button>
      <button className="btn btn-ghost btn-danger" onClick={onDiscard} disabled={busy}>
        Discard walk
      </button>
    </div>
  )
}
