import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrackingOptions } from '../types'
import { discardWalk, finishWalk, logEvent, removeEvent, startWalk } from './activeWalk'
import { getLocalWalk, listOutbox, resetLocalDb } from './localDb'
import { flush, getSyncState } from './sync'

const DOG = { id: 1, name: 'Bailey' }
const OPTIONS: TrackingOptions = {
  track_gps: true,
  track_stats: true,
  track_photos: false,
  track_activity: true,
  gps_mode: 'upload',
}

/** Fake API: records requests; can go offline or reject a path. */
function fakeServer() {
  const server = {
    online: true,
    reject: null as RegExp | null,
    requests: [] as string[],
    bodies: [] as unknown[],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      if (!server.online) throw new TypeError('Failed to fetch')
      const line = `${init?.method} ${path}`
      if (server.reject?.test(line)) {
        return new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 })
      }
      server.requests.push(line)
      server.bodies.push(init?.body ? JSON.parse(String(init.body)) : undefined)
      return new Response(null, { status: 204 })
    }),
  )
  return server
}

/** Let the auto-triggered sync and any follow-up pass finish. */
async function settle() {
  await flush()
  await flush()
}

beforeEach(async () => {
  await resetLocalDb()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('local-first walk', () => {
  it('keeps the walk and queues writes while offline, then syncs them in order', async () => {
    const server = fakeServer()
    server.online = false

    const walk = await startWalk(DOG, OPTIONS, '  Hot day  ')
    await logEvent(walk.id, 'pee')
    await logEvent(walk.id, 'note', ' Met a cat ')
    await settle()

    const local = await getLocalWalk(walk.id)
    expect(local?.status).toBe('active')
    expect(local?.pre_walk_notes).toBe('Hot day')
    expect(local?.events.map((e) => [e.type, e.notes])).toEqual([
      ['pee', null],
      ['note', 'Met a cat'],
    ])
    expect(await listOutbox()).toHaveLength(4)
    expect(getSyncState()).toMatchObject({ pending: 4, offline: true })

    server.online = true
    await settle()
    expect(server.requests).toEqual([
      'POST /api/walks',
      `POST /api/walks/${walk.id}/start`,
      `POST /api/walks/${walk.id}/events`,
      `POST /api/walks/${walk.id}/events`,
    ])
    expect(server.bodies[0]).toMatchObject({
      id: walk.id,
      dog_id: 1,
      gps_mode: 'upload',
      pre_walk_notes: 'Hot day',
    })
    expect(getSyncState()).toMatchObject({ pending: 0, offline: false })
    // Still recording, so it stays on the device.
    expect(await getLocalWalk(walk.id)).toBeDefined()
  })

  it('removes the local copy once a finished walk has synced', async () => {
    const server = fakeServer()
    const walk = await startWalk(DOG, OPTIONS, '')
    const event = await logEvent(walk.id, 'water')
    await removeEvent(walk.id, event.id)
    await finishWalk(walk.id)
    await settle()

    expect(server.requests.slice(-2)).toEqual([
      `DELETE /api/walks/${walk.id}/events/${event.id}`,
      `POST /api/walks/${walk.id}/finish`,
    ])
    expect(await getLocalWalk(walk.id)).toBeUndefined()
  })

  it('keeps a finished walk locally while its writes are still queued', async () => {
    const server = fakeServer()
    server.online = false
    const walk = await startWalk(DOG, OPTIONS, '')
    await finishWalk(walk.id)
    await settle()
    expect((await getLocalWalk(walk.id))?.status).toBe('completed')
  })

  it('sets rejected writes aside without blocking the rest', async () => {
    const server = fakeServer()
    server.reject = /\/events$/
    const walk = await startWalk(DOG, OPTIONS, '')
    await logEvent(walk.id, 'poop')
    await finishWalk(walk.id)
    await settle()

    expect(server.requests.at(-1)).toBe(`POST /api/walks/${walk.id}/finish`)
    const outbox = await listOutbox()
    expect(outbox).toHaveLength(1)
    expect(outbox[0].failed).toMatchObject({ status: 404, message: 'Not found' })
    expect(getSyncState()).toMatchObject({ pending: 0, failed: 1 })
    // Kept on the device because something failed.
    expect(await getLocalWalk(walk.id)).toBeDefined()
  })

  it('discards a walk locally and on the server', async () => {
    const server = fakeServer()
    const walk = await startWalk(DOG, { ...OPTIONS, track_gps: false }, '')
    expect(walk.gps_mode).toBeNull()
    await discardWalk(walk.id)
    await settle()
    expect(await getLocalWalk(walk.id)).toBeUndefined()
    expect(server.requests.at(-1)).toBe(`DELETE /api/walks/${walk.id}`)
  })
})
