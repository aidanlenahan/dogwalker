import { describe, expect, it } from 'vitest'
import { formatDay, formatDuration, formatElapsed } from './format'

describe('format', () => {
  it('formats elapsed time like a stopwatch', () => {
    expect(formatElapsed(42_000)).toBe('0:42')
    expect(formatElapsed(12 * 60_000 + 5_000)).toBe('12:05')
    expect(formatElapsed(3_729_000)).toBe('1:02:09')
  })

  it('formats durations in minutes and hours', () => {
    expect(formatDuration(32 * 60_000)).toBe('32 min')
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min')
  })

  it('names recent days', () => {
    const now = new Date(2026, 9, 7, 9, 0)
    expect(formatDay(new Date(2026, 9, 7, 1, 0).toISOString(), now)).toBe('Today')
    expect(formatDay(new Date(2026, 9, 6, 23, 0).toISOString(), now)).toBe('Yesterday')
    expect(formatDay(new Date(2026, 8, 29).toISOString(), now)).not.toMatch(/2026/)
    expect(formatDay(new Date(2025, 8, 29).toISOString(), now)).toMatch(/2025/)
  })
})
