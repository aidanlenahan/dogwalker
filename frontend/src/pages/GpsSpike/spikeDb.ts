// Throwaway (TODO Phase 2): IndexedDB log for the GPS feasibility spike.
// Separate database from the real app so it can be deleted wholesale later.

export type Visibility = DocumentVisibilityState

export interface FixEntry {
  kind: 'fix'
  session: string
  /** Wall-clock time the callback ran (ms). */
  t: number
  /** Position.timestamp (ms), when the fix was taken. */
  fixT: number
  lat: number
  lng: number
  accuracy: number
  altitude: number | null
  speed: number | null
  heading: number | null
  visibility: Visibility
  online: boolean
}

export interface EventEntry {
  kind: 'event' | 'error'
  session: string
  t: number
  name: string
  detail?: string
  visibility: Visibility
  online: boolean
}

export type LogEntry = FixEntry | EventEntry
export type StoredEntry = LogEntry & { id: number }

const DB_NAME = 'dogwalker-gps-spike'
const STORE = 'log'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      store.createIndex('session', 'session')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addEntry(entry: LogEntry): Promise<StoredEntry> {
  const db = await open()
  const id = await done(db.transaction(STORE, 'readwrite').objectStore(STORE).add(entry))
  return { ...entry, id: id as number }
}

export async function sessionEntries(session: string): Promise<StoredEntry[]> {
  const db = await open()
  const index = db.transaction(STORE).objectStore(STORE).index('session')
  return done(index.getAll(session)) as Promise<StoredEntry[]>
}

/** Distinct session ids, newest first (ids are ISO timestamps, so they sort). */
export async function listSessions(): Promise<string[]> {
  const db = await open()
  const index = db.transaction(STORE).objectStore(STORE).index('session')
  return new Promise((resolve, reject) => {
    const out: string[] = []
    const req = index.openKeyCursor(null, 'prevunique')
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return resolve(out)
      out.push(cursor.key as string)
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
}

export async function clearAll(): Promise<void> {
  const db = await open()
  await done(db.transaction(STORE, 'readwrite').objectStore(STORE).clear())
}
