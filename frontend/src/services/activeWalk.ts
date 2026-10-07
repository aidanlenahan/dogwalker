/**
 * Walk actions, local-first: each one updates the walk in IndexedDB and queues
 * the matching API write in the same transaction, then nudges the sync. The
 * walk survives refreshes, PWA restarts and dead zones (PRD §13, §26).
 */
import type { Dog, EventType, TrackingOptions, WalkDetail, WalkEvent } from '../types'
import { getLocalWalk, saveWalk, type LocalWalk, type OutboxEntry } from './localDb'
import { flush, notifyLocalChange } from './sync'

const nowIso = () => new Date().toISOString()

async function commit(walk: LocalWalk | null, entries: OutboxEntry[], removeId?: string) {
  await saveWalk(walk, entries, removeId)
  notifyLocalChange()
  void flush()
}

async function mustGet(walkId: string): Promise<LocalWalk> {
  const walk = await getLocalWalk(walkId)
  if (!walk) throw new Error('This walk is no longer on this device.')
  return walk
}

export async function startWalk(
  dog: Pick<Dog, 'id' | 'name'>,
  options: TrackingOptions,
  preWalkNotes: string,
): Promise<LocalWalk> {
  const id = crypto.randomUUID()
  const now = nowIso()
  const gps_mode = options.track_gps ? (options.gps_mode ?? 'live') : null
  const pre_walk_notes = preWalkNotes.trim() || null
  const walk: LocalWalk = {
    id,
    dog: { id: dog.id, name: dog.name },
    status: 'active',
    ...options,
    gps_mode,
    started_at: now,
    ended_at: null,
    distance_meters: null,
    pre_walk_notes,
    notes: null,
    created_at: now,
    updated_at: now,
    events: [],
  }
  await commit(walk, [
    {
      walkId: id,
      method: 'POST',
      path: '/api/walks',
      body: { id, dog_id: dog.id, ...options, gps_mode, pre_walk_notes },
    },
    { walkId: id, method: 'POST', path: `/api/walks/${id}/start`, body: { started_at: now } },
  ])
  return walk
}

export async function logEvent(
  walkId: string,
  type: EventType,
  notes: string | null = null,
): Promise<WalkEvent> {
  const walk = await mustGet(walkId)
  const event: WalkEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: nowIso(),
    notes: notes?.trim() || null,
    latitude: null,
    longitude: null,
  }
  walk.events = [...walk.events, event]
  walk.updated_at = event.timestamp
  await commit(walk, [{ walkId, method: 'POST', path: `/api/walks/${walkId}/events`, body: event }])
  return event
}

export async function removeEvent(walkId: string, eventId: string): Promise<void> {
  const walk = await mustGet(walkId)
  walk.events = walk.events.filter((e) => e.id !== eventId)
  walk.updated_at = nowIso()
  await commit(walk, [{ walkId, method: 'DELETE', path: `/api/walks/${walkId}/events/${eventId}` }])
}

export async function finishWalk(walkId: string): Promise<LocalWalk> {
  const walk = await mustGet(walkId)
  const now = nowIso()
  walk.status = 'completed'
  walk.ended_at = now
  walk.updated_at = now
  await commit(walk, [
    { walkId, method: 'POST', path: `/api/walks/${walkId}/finish`, body: { ended_at: now } },
  ])
  return walk
}

/** Throw the walk away, here and on the server. */
export async function discardWalk(walkId: string): Promise<void> {
  await commit(null, [{ walkId, method: 'DELETE', path: `/api/walks/${walkId}` }], walkId)
}

/**
 * Keep recording an active walk this device doesn't have locally (started on
 * another device, or site data was cleared). Nothing to queue: the server has it.
 */
export async function adoptWalk(detail: WalkDetail): Promise<LocalWalk> {
  const walk: LocalWalk = { ...detail, updated_at: nowIso() }
  await commit(walk, [])
  return walk
}
