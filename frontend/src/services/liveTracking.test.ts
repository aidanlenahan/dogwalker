import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HEARTBEAT_MS, LiveTrackingReporter } from './liveTracking'

vi.mock('./push', () => ({ closeNotifications: async () => undefined }))

let fetchMock: ReturnType<typeof vi.fn>
let beacon: ReturnType<typeof vi.fn>

function calls() {
  return fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`)
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  beacon = vi.fn(() => true)
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
})

afterEach(() => {
  setVisibility('visible')
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('LiveTrackingReporter', () => {
  it('heartbeats on start and every interval with the resume URL', () => {
    const r = new LiveTrackingReporter('2026-10-07T12:00:00.000Z', '/dev/gps')
    r.start()
    vi.advanceTimersByTime(HEARTBEAT_MS * 2)
    const url = '/api/tracking/2026-10-07T12%3A00%3A00.000Z/heartbeat'
    expect(calls()).toEqual([`POST ${url}`, `POST ${url}`, `POST ${url}`])
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      resume_url: '/dev/gps',
      visible: true,
    })
    r.stop()
  })

  it('beacons when hidden and heartbeats again when visible', () => {
    const r = new LiveTrackingReporter('s', '/')
    r.start()
    setVisibility('hidden')
    expect(beacon).toHaveBeenCalledWith('/api/tracking/s/hidden')
    fetchMock.mockClear()
    setVisibility('visible')
    expect(calls()).toEqual(['POST /api/tracking/s/heartbeat'])
    r.stop()
  })

  it('skips heartbeats while hidden (iOS runs hidden pages for a few seconds)', () => {
    const r = new LiveTrackingReporter('s', '/')
    r.start()
    setVisibility('hidden')
    fetchMock.mockClear()
    vi.advanceTimersByTime(HEARTBEAT_MS * 3)
    expect(calls()).toEqual([])
    r.stop()
  })

  it('stop closes the session; pause just goes quiet', () => {
    const r = new LiveTrackingReporter('s', '/')
    r.start()
    r.pause()
    fetchMock.mockClear()
    vi.advanceTimersByTime(HEARTBEAT_MS * 3)
    expect(calls()).toEqual([])

    r.start()
    r.stop()
    expect(calls().at(-1)).toBe('DELETE /api/tracking/s')
    fetchMock.mockClear()
    setVisibility('hidden')
    expect(beacon).not.toHaveBeenCalled()
  })
})
