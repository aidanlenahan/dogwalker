// Throwaway (TODO Phase 2): GPS feasibility spike. Logs every watchPosition
// sample and lifecycle event to IndexedDB so we can see what an installed
// iPhone PWA does with the screen locked, app switched, offline, etc.
// Delete this folder (and its route + dashboard link) once docs/gps-findings.md is written.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { usePushStatus } from '../../hooks/usePushStatus'
import { LiveTrackingReporter } from '../../services/liveTracking'
import {
  addEntry,
  clearAll,
  listSessions,
  sessionEntries,
  type EventEntry,
  type StoredEntry,
} from './spikeDb'
import { summarize, toGpx } from './spikeStats'

const ACTIVE_KEY = 'gps-spike-active'
const WAKE_KEY = 'gps-spike-wakelock'

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLS(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode etc. Resume-after-reload just won't work.
  }
}

const ERROR_NAMES: Record<number, string> = {
  1: 'PERMISSION_DENIED',
  2: 'POSITION_UNAVAILABLE',
  3: 'TIMEOUT',
}

const time = (t: number) => new Date(t).toLocaleTimeString([], { hour12: false })

function duration(ms: number) {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

async function shareOrDownload(files: File[]) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  for (const f of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }
}

export function GpsSpikePage() {
  const [session, setSession] = useState<string | null>(null)
  const [sessions, setSessions] = useState<string[]>([])
  const [entries, setEntries] = useState<StoredEntry[]>([])
  const [recording, setRecording] = useState(false)
  const [wakeWanted, setWakeWanted] = useState(() => readLS(WAKE_KEY) === '1')
  const [wakeHeld, setWakeHeld] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const sessionRef = useRef<string | null>(null)
  const watchRef = useRef<number | null>(null)
  const wakeRef = useRef<WakeLockSentinel | null>(null)
  const reporterRef = useRef<LiveTrackingReporter | null>(null)
  const [pushStatus] = usePushStatus()

  const log = useCallback(async (kind: EventEntry['kind'], name: string, detail?: string) => {
    const s = sessionRef.current
    if (!s) return
    const stored = await addEntry({
      kind,
      session: s,
      t: Date.now(),
      name,
      detail,
      visibility: document.visibilityState,
      online: navigator.onLine,
    })
    if (sessionRef.current === s) setEntries((prev) => [...prev, stored])
  }, [])

  const startWatch = useCallback(() => {
    if (watchRef.current !== null) return
    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const s = sessionRef.current
        if (!s) return
        const c = pos.coords
        const stored = await addEntry({
          kind: 'fix',
          session: s,
          t: Date.now(),
          fixT: pos.timestamp,
          lat: c.latitude,
          lng: c.longitude,
          accuracy: c.accuracy,
          altitude: c.altitude,
          speed: c.speed,
          heading: c.heading,
          visibility: document.visibilityState,
          online: navigator.onLine,
        })
        if (sessionRef.current === s) setEntries((prev) => [...prev, stored])
      },
      (err) => {
        void log('error', ERROR_NAMES[err.code] ?? `code ${err.code}`, err.message)
        if (err.code === 1)
          setProblem('Location permission denied. Allow it in Settings and retry.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    )
  }, [log])

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = null
  }, [])

  // Server-side "GPS recording paused" push alert (services/liveTracking.ts).
  const startReporter = useCallback((s: string) => {
    reporterRef.current?.pause()
    reporterRef.current = new LiveTrackingReporter(s, '/dev/gps')
    reporterRef.current.start()
  }, [])

  const loadSession = useCallback(async (s: string | null) => {
    sessionRef.current = s
    setSession(s)
    setEntries(s ? await sessionEntries(s) : [])
  }, [])

  // Mount: list sessions; if a recording was in progress (reload, PWA
  // restart, navigated away), pick it back up so we can see the gap.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const all = await listSessions()
        if (cancelled) return
        setSessions(all)
        const active = readLS(ACTIVE_KEY)
        await loadSession(active ?? all[0] ?? null)
        if (cancelled || !active) return
        setRecording(true)
        await log('event', 'resumed', 'page loaded with an active session')
        startWatch()
        startReporter(active)
      } catch (e) {
        setProblem(`IndexedDB unavailable: ${(e as Error).message}`)
      }
    })()
    return () => {
      cancelled = true
      if (watchRef.current !== null) void log('event', 'unmount')
      stopWatch()
      // Not recording while away from this page, so let the server alert.
      reporterRef.current?.pause()
    }
  }, [loadSession, log, startWatch, startReporter, stopWatch])

  // Lifecycle events while recording.
  useEffect(() => {
    if (!recording) return
    const onVis = () => void log('event', `visibility:${document.visibilityState}`)
    const onHide = (e: PageTransitionEvent) =>
      void log('event', 'pagehide', `persisted=${e.persisted}`)
    const onShow = (e: PageTransitionEvent) =>
      void log('event', 'pageshow', `persisted=${e.persisted}`)
    const onOnline = () => void log('event', 'online')
    const onOffline = () => void log('event', 'offline')
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [recording, log])

  // Screen wake lock: the system drops it whenever the page is hidden,
  // so re-request on every return to the foreground.
  useEffect(() => {
    if (!recording || !wakeWanted || !('wakeLock' in navigator)) return
    let stopped = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || wakeRef.current) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (stopped) return void lock.release()
        wakeRef.current = lock
        setWakeHeld(true)
        void log('event', 'wakelock:acquired')
        lock.addEventListener('release', () => {
          wakeRef.current = null
          setWakeHeld(false)
          void log('event', 'wakelock:released')
        })
      } catch (e) {
        void log('error', 'wakelock:failed', (e as Error).message)
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', acquire)
      void wakeRef.current?.release()
    }
  }, [recording, wakeWanted, log])

  // Tick for "last fix Ns ago" and elapsed time.
  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [recording])

  async function start() {
    if (!('geolocation' in navigator)) return setProblem('Geolocation not supported.')
    setProblem(null)
    const s = new Date().toISOString()
    await loadSession(s)
    setSessions((prev) => [s, ...prev])
    writeLS(ACTIVE_KEY, s)
    setRecording(true)
    const standalone = matchMedia('(display-mode: standalone)').matches
    await log('event', 'start', `standalone=${standalone} ua=${navigator.userAgent}`)
    startWatch()
    startReporter(s)
  }

  async function stop() {
    stopWatch()
    reporterRef.current?.stop()
    reporterRef.current = null
    await log('event', 'stop')
    writeLS(ACTIVE_KEY, null)
    setRecording(false)
  }

  async function exportSession() {
    if (!session) return
    const base = `gps-spike-${session.replace(/[:.]/g, '-')}`
    await shareOrDownload([
      new File([JSON.stringify(entries, null, 1)], `${base}.json`, { type: 'application/json' }),
      new File([toGpx(entries, base)], `${base}.gpx`, { type: 'application/gpx+xml' }),
    ])
  }

  async function wipe() {
    if (!confirm('Delete every GPS spike session on this device?')) return
    await clearAll()
    setSessions([])
    await loadSession(null)
  }

  function toggleWake(on: boolean) {
    setWakeWanted(on)
    writeLS(WAKE_KEY, on ? '1' : null)
  }

  const sum = summarize(entries)
  const sinceFix = sum.lastFixAt ? now - sum.lastFixAt : null
  const recent = entries.slice(-40).reverse()

  return (
    <div className="page stack-lg spike">
      <div className="stack">
        <h1 className="page-title">GPS test</h1>
        <p className="muted">
          Throwaway spike. Start, then lock the screen, switch apps, go offline, walk around. Come
          back and check the gaps.
        </p>
      </div>

      {problem && (
        <p className="card form-error" role="alert">
          {problem}
        </p>
      )}

      {recording ? (
        <button className="btn btn-primary btn-xl spike-stop" onClick={stop}>
          Stop recording
        </button>
      ) : (
        <button className="btn btn-primary btn-xl" onClick={start}>
          Start recording
        </button>
      )}

      <p className="muted">
        Pause alert:{' '}
        {pushStatus === 'on' ? (
          'on. Lock the phone while recording and a notification should arrive within ~15 s.'
        ) : (
          <>
            off. <Link to="/settings">Turn on notifications</Link> to get one if recording stops.
          </>
        )}
      </p>

      <label className="spike-toggle">
        <input
          type="checkbox"
          checked={wakeWanted}
          onChange={(e) => toggleWake(e.target.checked)}
        />
        Keep screen awake{' '}
        {!('wakeLock' in navigator)
          ? '(not supported)'
          : recording && wakeWanted && (wakeHeld ? '(held)' : '(not held)')}
      </label>

      {!recording && sessions.length > 0 && (
        <label className="field">
          Session
          <select value={session ?? ''} onChange={(e) => void loadSession(e.target.value)}>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {new Date(s).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
      )}

      {session && (
        <>
          <dl className="spike-stats">
            <Stat label="Fixes" value={sum.fixes} />
            <Stat label="While hidden" value={sum.fixesWhileHidden} />
            <Stat
              label="Last fix"
              value={
                sinceFix === null
                  ? '–'
                  : recording
                    ? `${Math.round(sinceFix / 1000)}s ago`
                    : time(sum.lastFixAt!)
              }
            />
            <Stat
              label="Last acc."
              value={sum.lastAccuracy === null ? '–' : `${Math.round(sum.lastAccuracy)} m`}
            />
            <Stat
              label="Median acc."
              value={sum.medianAccuracy === null ? '–' : `${Math.round(sum.medianAccuracy)} m`}
            />
            <Stat label="Errors" value={sum.errors} />
            <Stat
              label="Elapsed"
              value={duration(recording && entries[0] ? now - entries[0].t : sum.durationMs)}
            />
            <Stat label="Distance ≈" value={`${Math.round(sum.distanceM)} m`} />
          </dl>

          <section className="stack">
            <h2 className="section-label">Gaps over 15 s ({sum.gaps.length})</h2>
            {sum.gaps.length === 0 ? (
              <p className="muted">None.</p>
            ) : (
              <ul className="spike-list">
                {sum.gaps.map((g) => (
                  <li key={g.from}>
                    {time(g.from)} → {time(g.to)} · <strong>{duration(g.ms)}</strong>
                    {g.hidden && ' · app was hidden'}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="stack">
            <h2 className="section-label">Recent log</h2>
            <ul className="spike-list spike-log">
              {recent.map((e) => (
                <li key={e.id} className={e.kind === 'error' ? 'form-error' : undefined}>
                  <span className="muted">{time(e.t)}</span>{' '}
                  {e.kind === 'fix'
                    ? `fix ±${Math.round(e.accuracy)}m${e.visibility === 'hidden' ? ' (hidden)' : ''}${e.online ? '' : ' (offline)'}`
                    : `${e.name}${e.detail && !e.detail.startsWith('standalone') ? ` – ${e.detail}` : ''}`}
                </li>
              ))}
            </ul>
          </section>

          <button className="btn btn-secondary" onClick={exportSession}>
            Export session (JSON + GPX)
          </button>
        </>
      )}

      {!recording && sessions.length > 0 && (
        <button className="btn btn-ghost" onClick={wipe}>
          Delete all test data
        </button>
      )}

      <Link to="/dashboard" className="btn btn-ghost">
        Back to home
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="spike-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
