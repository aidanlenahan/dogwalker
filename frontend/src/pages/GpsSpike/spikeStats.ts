// Throwaway (TODO Phase 2): pure summaries of a GPS spike session.
import type { FixEntry, LogEntry } from './spikeDb'

/** Gaps between fixes longer than this are reported. */
export const GAP_MS = 15_000

export interface Gap {
  from: number
  to: number
  ms: number
  /** Whether the app went to the background at some point inside the gap. */
  hidden: boolean
}

export interface Summary {
  fixes: number
  fixesWhileHidden: number
  errors: number
  medianAccuracy: number | null
  lastAccuracy: number | null
  lastFixAt: number | null
  durationMs: number
  distanceM: number
  gaps: Gap[]
}

const R = 6_371_000

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Rough numbers only: distance uses fixes with accuracy <= `maxAccuracy`
 * and no jump filtering. Real filtering is Phase 5.
 */
export function summarize(entries: LogEntry[], maxAccuracy = 30): Summary {
  const fixes = entries.filter((e): e is FixEntry => e.kind === 'fix')
  const hiddenAt = entries
    .filter((e) => e.kind === 'event' && e.name === 'visibility:hidden')
    .map((e) => e.t)

  const gaps: Gap[] = []
  for (let i = 1; i < fixes.length; i++) {
    const from = fixes[i - 1].t
    const to = fixes[i].t
    if (to - from > GAP_MS) {
      gaps.push({ from, to, ms: to - from, hidden: hiddenAt.some((t) => t >= from && t <= to) })
    }
  }

  let distanceM = 0
  let prev: FixEntry | null = null
  for (const f of fixes) {
    if (f.accuracy > maxAccuracy) continue
    if (prev) distanceM += haversine(prev, f)
    prev = f
  }

  const last = fixes.at(-1) ?? null
  return {
    fixes: fixes.length,
    fixesWhileHidden: fixes.filter((f) => f.visibility === 'hidden').length,
    errors: entries.filter((e) => e.kind === 'error').length,
    medianAccuracy: median(fixes.map((f) => f.accuracy)),
    lastAccuracy: last?.accuracy ?? null,
    lastFixAt: last?.t ?? null,
    durationMs: entries.length > 1 ? entries.at(-1)!.t - entries[0].t : 0,
    distanceM,
    gaps,
  }
}

export function toGpx(entries: LogEntry[], name: string): string {
  const pts = entries
    .filter((e): e is FixEntry => e.kind === 'fix')
    .map(
      (f) =>
        `<trkpt lat="${f.lat}" lon="${f.lng}"><time>${new Date(f.fixT).toISOString()}</time>` +
        `<hdop>${f.accuracy}</hdop></trkpt>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="dogwalker-gps-spike" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>${name}</name><trkseg>
${pts}
</trkseg></trk>
</gpx>
`
}
