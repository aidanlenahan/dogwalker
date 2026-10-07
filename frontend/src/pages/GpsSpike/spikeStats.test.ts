import { describe, expect, it } from 'vitest'
import type { EventEntry, FixEntry, LogEntry } from './spikeDb'
import { haversine, summarize } from './spikeStats'

const base = { session: 's', visibility: 'visible' as const, online: true }

function fix(
  t: number,
  lat: number,
  accuracy = 5,
  visibility: 'visible' | 'hidden' = 'visible',
): FixEntry {
  return {
    ...base,
    kind: 'fix',
    t,
    fixT: t,
    lat,
    lng: 0,
    accuracy,
    altitude: null,
    speed: null,
    heading: null,
    visibility,
  }
}

function event(t: number, name: string): EventEntry {
  return { ...base, kind: 'event', t, name }
}

describe('haversine', () => {
  it('is about 111 km per degree of latitude', () => {
    expect(haversine({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1)
  })
})

describe('summarize', () => {
  it('finds gaps and whether the app was hidden during them', () => {
    const log: LogEntry[] = [
      fix(0, 0),
      fix(1_000, 0),
      event(5_000, 'visibility:hidden'),
      fix(60_000, 0, 5, 'hidden'),
      fix(90_000, 0),
    ]
    const s = summarize(log)
    expect(s.fixes).toBe(4)
    expect(s.fixesWhileHidden).toBe(1)
    expect(s.gaps).toEqual([
      { from: 1_000, to: 60_000, ms: 59_000, hidden: true },
      { from: 60_000, to: 90_000, ms: 30_000, hidden: false },
    ])
    expect(s.durationMs).toBe(90_000)
  })

  it('skips inaccurate fixes for distance and takes the median accuracy', () => {
    const s = summarize([fix(0, 0, 5), fix(1, 0.5, 500), fix(2, 0.001, 10)])
    expect(s.distanceM).toBeCloseTo(111, 0)
    expect(s.medianAccuracy).toBe(10)
    expect(s.lastAccuracy).toBe(10)
  })

  it('handles an empty session', () => {
    const s = summarize([])
    expect(s.fixes).toBe(0)
    expect(s.medianAccuracy).toBeNull()
    expect(s.gaps).toEqual([])
  })
})
