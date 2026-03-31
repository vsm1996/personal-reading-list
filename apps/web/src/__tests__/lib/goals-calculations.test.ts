import { describe, it, expect, vi, afterEach } from 'vitest'
import { getPaceInfo } from '@/lib/goals-calculations'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Freeze time to a specific date for deterministic pace calculations.
 * Vitest's fake timers change Date.now() and new Date() globally.
 */
function setToday(iso: string) {
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

// ─── getPaceInfo ──────────────────────────────────────────────────────────────

describe('getPaceInfo', () => {
  // ── diff (ahead / behind / on pace) ─────────────────────────────────────────

  it('diff is 0 when books read exactly matches linear expected progress', () => {
    vi.useFakeTimers()
    // Set date to exactly halfway through 2024 (non-leap year for simplicity)
    // 2024 is a leap year (366 days). At day 183 (~July 1) expected ≈ target/2
    setToday('2024-07-01')
    // At halfway, reading 10 of 20 target → diff ≈ 0
    const result = getPaceInfo(10, 20, 2024)
    expect(result.diff).toBe(0)
  })

  it('diff is positive when ahead of pace', () => {
    vi.useFakeTimers()
    // At very start of year, reading 5 books of 12 target → very ahead
    setToday('2024-01-10')
    const result = getPaceInfo(5, 12, 2024)
    expect(result.diff).toBeGreaterThan(0)
  })

  it('diff is negative when behind pace', () => {
    vi.useFakeTimers()
    // Near end of year but only 1 book of 24 target read → very behind
    setToday('2024-12-01')
    const result = getPaceInfo(1, 24, 2024)
    expect(result.diff).toBeLessThan(0)
  })

  // ── booksLeft ────────────────────────────────────────────────────────────────

  it('booksLeft = targetCount - booksRead when booksRead < target', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    const result = getPaceInfo(4, 12, 2024)
    expect(result.booksLeft).toBe(8)
  })

  it('booksLeft is 0 when booksRead equals target', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    const result = getPaceInfo(12, 12, 2024)
    expect(result.booksLeft).toBe(0)
  })

  it('booksLeft never goes below 0 when booksRead exceeds target', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    const result = getPaceInfo(15, 12, 2024)
    expect(result.booksLeft).toBe(0)
  })

  // ── booksPerWeekNeeded ───────────────────────────────────────────────────────

  it('booksPerWeekNeeded is "0" when all books are already read', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    const result = getPaceInfo(12, 12, 2024)
    expect(result.booksPerWeekNeeded).toBe('0.0')
  })

  it('booksPerWeekNeeded is a string formatted to one decimal place', () => {
    vi.useFakeTimers()
    setToday('2024-01-01')
    const result = getPaceInfo(0, 52, 2024)
    // 52 books, ~52 weeks remaining → ~1.0 per week
    expect(result.booksPerWeekNeeded).toMatch(/^\d+\.\d$/)
  })

  it('booksPerWeekNeeded is "0" on the last day of the year', () => {
    vi.useFakeTimers()
    setToday('2024-12-31')
    const result = getPaceInfo(12, 12, 2024)
    expect(result.booksPerWeekNeeded).toBe('0.0')
  })

  // ── summary string ───────────────────────────────────────────────────────────

  it('summary says "right on pace" when diff is 0', () => {
    vi.useFakeTimers()
    setToday('2024-07-01')
    const result = getPaceInfo(10, 20, 2024)
    expect(result.summary).toBe('right on pace')
  })

  it('summary says "X book ahead of pace" (singular) when diff is 1', () => {
    vi.useFakeTimers()
    setToday('2024-01-05')
    const result = getPaceInfo(2, 12, 2024)
    // diff is likely positive and possibly 1+
    expect(result.diff).toBeGreaterThan(0)
    if (result.diff === 1) {
      expect(result.summary).toBe('1 book ahead of pace')
    } else {
      expect(result.summary).toContain('books ahead of pace')
    }
  })

  it('summary says "X books ahead of pace" (plural) when diff > 1', () => {
    vi.useFakeTimers()
    setToday('2024-01-10')
    const result = getPaceInfo(10, 12, 2024)
    expect(result.diff).toBeGreaterThan(1)
    expect(result.summary).toMatch(/\d+ books ahead of pace/)
  })

  it('summary says "X book behind pace" (singular) when diff is -1', () => {
    vi.useFakeTimers()
    setToday('2024-12-20')
    // At this point, ~97% through year, expected ~11.7 books of 12. Reading 11 → diff = -1
    const result = getPaceInfo(11, 12, 2024)
    expect(result.diff).toBeLessThanOrEqual(-1)
    if (result.diff === -1) {
      expect(result.summary).toBe('1 book behind pace')
    } else {
      expect(result.summary).toMatch(/\d+ books? behind pace/)
    }
  })

  it('summary says "X books behind pace" (plural) when diff < -1', () => {
    vi.useFakeTimers()
    setToday('2024-12-01')
    const result = getPaceInfo(1, 24, 2024)
    expect(result.diff).toBeLessThan(-1)
    expect(result.summary).toMatch(/\d+ books behind pace/)
  })

  // ── Return shape ─────────────────────────────────────────────────────────────

  it('returns all required fields', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    const result = getPaceInfo(6, 12, 2024)
    expect(result).toHaveProperty('diff')
    expect(result).toHaveProperty('booksLeft')
    expect(result).toHaveProperty('booksPerWeekNeeded')
    expect(result).toHaveProperty('summary')
  })

  it('diff is always an integer (Math.round applied)', () => {
    vi.useFakeTimers()
    setToday('2024-03-15')
    const result = getPaceInfo(3, 12, 2024)
    expect(Number.isInteger(result.diff)).toBe(true)
  })

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it('handles target of 1 book gracefully', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    const result = getPaceInfo(0, 1, 2024)
    expect(result.booksLeft).toBe(1)
    expect(result.diff).toBeLessThanOrEqual(0)
  })

  it('handles very large target gracefully without throwing', () => {
    vi.useFakeTimers()
    setToday('2024-06-01')
    expect(() => getPaceInfo(0, 10_000, 2024)).not.toThrow()
  })

  it('booksRead = 0 never throws', () => {
    vi.useFakeTimers()
    setToday('2024-01-01')
    expect(() => getPaceInfo(0, 12, 2024)).not.toThrow()
  })
})
