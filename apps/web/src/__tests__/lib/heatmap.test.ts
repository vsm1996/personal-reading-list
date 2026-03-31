import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildHeatmapGrid, heatmapColor } from '@/lib/heatmap'

afterEach(() => {
  vi.useRealTimers()
})

// ─── buildHeatmapGrid ─────────────────────────────────────────────────────────

describe('buildHeatmapGrid', () => {
  it('always returns exactly 52 weeks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    expect(weeks).toHaveLength(52)
  })

  it('each week contains exactly 7 cells', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    for (const week of weeks) {
      expect(week).toHaveLength(7)
    }
  })

  it('every cell has a date, day, and count', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    for (const week of weeks) {
      for (const cell of week) {
        expect(cell).toHaveProperty('date')
        expect(cell).toHaveProperty('day')
        expect(cell).toHaveProperty('count')
        expect(typeof cell.date).toBe('string')
        expect(typeof cell.count).toBe('number')
      }
    }
  })

  it('all cell dates are in YYYY-MM-DD format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    for (const week of weeks) {
      for (const cell of week) {
        expect(cell.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }
    }
  })

  it('injects count from data into matching date cell', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    // Pick a date that falls within the last 52 weeks
    const targetDate = '2024-05-20'
    const { weeks } = buildHeatmapGrid([{ date: targetDate, count: 7 }])
    const allCells = weeks.flat()
    const match = allCells.find((c) => c.date === targetDate)
    expect(match).toBeDefined()
    expect(match!.count).toBe(7)
  })

  it('cells with no matching data entry have count 0', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    const allCells = weeks.flat()
    for (const cell of allCells) {
      expect(cell.count).toBe(0)
    }
  })

  it('data outside the 52-week window is silently ignored', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    // A date from 2 years ago should not appear in any cell
    const oldDate = '2022-01-01'
    const { weeks } = buildHeatmapGrid([{ date: oldDate, count: 99 }])
    const allCells = weeks.flat()
    const match = allCells.find((c) => c.date === oldDate)
    // It either doesn't appear, or if it does its count should be 0
    // (the date is outside range so it won't be in the grid at all)
    if (match) {
      expect(match.count).toBe(0)
    } else {
      expect(match).toBeUndefined()
    }
  })

  it('all 364 cell dates are unique', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    const dates = weeks.flat().map((c) => c.date)
    const unique = new Set(dates)
    expect(unique.size).toBe(dates.length)
  })

  it('dates are in ascending chronological order across all weeks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    const dates = weeks.flat().map((c) => c.date)
    const sorted = [...dates].sort()
    expect(dates).toEqual(sorted)
  })

  it('the last cell in the last week is today or in the past', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    const lastWeek = weeks[weeks.length - 1]!
    const lastCell = lastWeek[lastWeek.length - 1]!
    expect(lastCell.date <= '2024-06-15').toBe(true)
  })

  it('handles empty data array without throwing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01'))
    expect(() => buildHeatmapGrid([])).not.toThrow()
  })

  it('handles multiple data entries for different dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const data = [
      { date: '2024-05-01', count: 3 },
      { date: '2024-05-15', count: 1 },
      { date: '2024-06-01', count: 5 },
    ]
    const { weeks } = buildHeatmapGrid(data)
    const allCells = weeks.flat()
    expect(allCells.find((c) => c.date === '2024-05-01')?.count).toBe(3)
    expect(allCells.find((c) => c.date === '2024-05-15')?.count).toBe(1)
    expect(allCells.find((c) => c.date === '2024-06-01')?.count).toBe(5)
  })

  it('day field is the 0-indexed day within the week (0=Sunday..6=Saturday)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
    const { weeks } = buildHeatmapGrid([])
    // Each column has cells with day 0..6
    for (const week of weeks) {
      for (let i = 0; i < 7; i++) {
        expect(week[i]!.day).toBe(i)
      }
    }
  })
})

// ─── heatmapColor ─────────────────────────────────────────────────────────────

describe('heatmapColor', () => {
  it('returns the bg-tertiary class for count 0 (no activity)', () => {
    expect(heatmapColor(0)).toBe('bg-bg-tertiary')
  })

  it('returns 20% accent opacity for count 1 (low activity)', () => {
    expect(heatmapColor(1)).toBe('bg-accent/20')
  })

  it('returns 20% accent opacity for count 2 (low activity boundary)', () => {
    expect(heatmapColor(2)).toBe('bg-accent/20')
  })

  it('returns 50% accent opacity for count 3 (medium activity)', () => {
    expect(heatmapColor(3)).toBe('bg-accent/50')
  })

  it('returns 50% accent opacity for count 5 (medium activity boundary)', () => {
    expect(heatmapColor(5)).toBe('bg-accent/50')
  })

  it('returns full accent for count 6 (high activity)', () => {
    expect(heatmapColor(6)).toBe('bg-accent')
  })

  it('returns full accent for very high count', () => {
    expect(heatmapColor(100)).toBe('bg-accent')
  })

  it('returns a non-empty string for any non-negative integer', () => {
    for (const count of [0, 1, 2, 3, 4, 5, 6, 10, 50]) {
      expect(heatmapColor(count)).toBeTruthy()
    }
  })
})
