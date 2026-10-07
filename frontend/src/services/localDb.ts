/**
 * The app's IndexedDB: walks in progress and the outbox of API writes that
 * haven't reached the server yet (PRD §13, §26). Kept small and boring on
 * purpose; this is what stops a refresh or dead zone from losing a walk.
 */
import type { WalkDetail } from '../types'

/** A walk this device is recording or hasn't finished syncing. */
export interface LocalWalk extends WalkDetail {
  updated_at: string
}

export interface OutboxEntry {
  seq?: number
  walkId: string
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  /** Set when the server rejected it (4xx); kept so nothing vanishes silently. */
  failed?: { status: number; message: string; at: string }
}

const DB_NAME = 'dogwalker'
const WALKS = 'walks'
const OUTBOX = 'outbox'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      db.createObjectStore(WALKS, { keyPath: 'id' })
      db.createObjectStore(OUTBOX, { keyPath: 'seq', autoIncrement: true })
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

function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function getLocalWalk(id: string): Promise<LocalWalk | undefined> {
  const db = await open()
  return done(db.transaction(WALKS).objectStore(WALKS).get(id))
}

export async function listLocalWalks(): Promise<LocalWalk[]> {
  const db = await open()
  return done(db.transaction(WALKS).objectStore(WALKS).getAll())
}

/**
 * Save the walk and queue its API writes in one transaction, so the local copy
 * and the outbox can never disagree after a crash.
 */
export async function saveWalk(
  walk: LocalWalk | null,
  entries: OutboxEntry[],
  removeWalkId?: string,
): Promise<void> {
  const db = await open()
  const tx = db.transaction([WALKS, OUTBOX], 'readwrite')
  if (walk) tx.objectStore(WALKS).put(walk)
  if (removeWalkId) tx.objectStore(WALKS).delete(removeWalkId)
  for (const e of entries) tx.objectStore(OUTBOX).add(e)
  await committed(tx)
}

export async function deleteLocalWalk(id: string): Promise<void> {
  const db = await open()
  await done(db.transaction(WALKS, 'readwrite').objectStore(WALKS).delete(id))
}

/** All outbox entries in the order they were queued. */
export async function listOutbox(): Promise<OutboxEntry[]> {
  const db = await open()
  return done(db.transaction(OUTBOX).objectStore(OUTBOX).getAll())
}

export async function removeOutbox(seq: number): Promise<void> {
  const db = await open()
  await done(db.transaction(OUTBOX, 'readwrite').objectStore(OUTBOX).delete(seq))
}

export async function putOutbox(entry: OutboxEntry): Promise<void> {
  const db = await open()
  await done(db.transaction(OUTBOX, 'readwrite').objectStore(OUTBOX).put(entry))
}

/** Tests only. */
export async function resetLocalDb(): Promise<void> {
  const db = await open()
  const tx = db.transaction([WALKS, OUTBOX], 'readwrite')
  tx.objectStore(WALKS).clear()
  tx.objectStore(OUTBOX).clear()
  await committed(tx)
}
