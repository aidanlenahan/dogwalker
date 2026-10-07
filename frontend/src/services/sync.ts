/**
 * Sends queued writes (services/localDb.ts outbox) to the server in order.
 * Every write is idempotent server-side, so retrying after a timeout is safe.
 */
import { ApiError, request } from './api'
import {
  deleteLocalWalk,
  listLocalWalks,
  listOutbox,
  putOutbox,
  removeOutbox,
  type OutboxEntry,
} from './localDb'

export interface SyncState {
  /** Writes still waiting to reach the server. */
  pending: number
  /** Writes the server rejected; kept locally so nothing disappears silently. */
  failed: number
  syncing: boolean
  /** Last attempt couldn't reach the server. */
  offline: boolean
}

const RETRY_MS = 15_000

let state: SyncState = { pending: 0, failed: 0, syncing: false, offline: false }
const listeners = new Set<() => void>()
let running: Promise<void> | null = null
let again = false

function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function getSyncState(): SyncState {
  return state
}

/** Called on any sync-state change and after any local walk change. */
export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Tell subscribers local walk data changed (pages re-read IndexedDB). */
export function notifyLocalChange(): void {
  listeners.forEach((l) => l())
}

function retryable(err: unknown): boolean {
  // Network down, server trouble, signed out, or throttled: keep it queued.
  if (!(err instanceof ApiError)) return true
  return err.status === 0 || err.status >= 500 || err.status === 401 || err.status === 429
}

async function countOutbox(entries?: OutboxEntry[]) {
  const all = entries ?? (await listOutbox())
  const failed = all.filter((e) => e.failed).length
  set({ pending: all.length - failed, failed })
}

/** Completed walks with nothing left to send live on the server now. */
async function purgeSynced() {
  const outbox = await listOutbox()
  const busy = new Set(outbox.map((e) => e.walkId))
  for (const w of await listLocalWalks()) {
    if (w.status === 'completed' && !busy.has(w.id)) await deleteLocalWalk(w.id)
  }
}

async function run(): Promise<void> {
  set({ syncing: true })
  try {
    for (const entry of await listOutbox()) {
      if (entry.failed) continue
      try {
        await request(entry.method, entry.path, entry.body)
        await removeOutbox(entry.seq!)
        set({ offline: false })
      } catch (err) {
        if (retryable(err)) {
          set({ offline: err instanceof ApiError && err.status === 0 })
          break
        }
        const e = err as ApiError
        await putOutbox({
          ...entry,
          failed: { status: e.status, message: e.message, at: new Date().toISOString() },
        })
      }
    }
    await purgeSynced()
  } finally {
    await countOutbox()
    set({ syncing: false })
    notifyLocalChange()
  }
}

/** Send what's queued. Calls while a sync is running schedule one more pass. */
export function flush(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = run().finally(() => {
    running = null
    if (again) {
      again = false
      void flush()
    }
  })
  return running
}

let started = false

/** Retry on reconnect, on return to the foreground, and every 15 s while anything is queued. */
export function startSync(): () => void {
  if (started) return () => undefined
  started = true
  const kick = () => void flush()
  const onVisible = () => document.visibilityState === 'visible' && kick()
  const timer = setInterval(() => state.pending > 0 && kick(), RETRY_MS)
  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', onVisible)
  void countOutbox().then(kick)
  return () => {
    started = false
    clearInterval(timer)
    window.removeEventListener('online', kick)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
