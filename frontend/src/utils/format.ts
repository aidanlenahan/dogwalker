import type { EventType } from '../types'

export const EVENT_LABELS: Record<EventType, string> = {
  pee: 'Pee',
  poop: 'Poop',
  water: 'Water',
  fed: 'Fed',
  note: 'Note',
  other: 'Other',
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 0:42, 12:05, 1:02:09 */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** "32 min", "1 h 05 min" */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60_000))
  if (total < 60) return `${total} min`
  return `${Math.floor(total / 60)} h ${pad(total % 60)} min`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** "Today", "Yesterday", "Sep 29", or "Sep 29, 2025" for other years. */
export function formatDay(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

export function walkDurationMs(walk: { started_at: string | null; ended_at: string | null }) {
  if (!walk.started_at) return 0
  const end = walk.ended_at ? new Date(walk.ended_at).getTime() : Date.now()
  return end - new Date(walk.started_at).getTime()
}
