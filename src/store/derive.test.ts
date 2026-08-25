import { describe, test, expect } from 'vitest'
import { endDate, tripOverlaps, isPast, formatRange } from './derive'
import type { Trip } from './types'

const trip = (id: string, startDate: string, durationDays: number): Trip => ({
  id,
  destination: 'Somewhere',
  startDate,
  durationDays,
  purpose: '',
  status: 'planned',
  notes: '',
})

describe('endDate', () => {
  test('a one-day trip ends the day it starts', () => {
    expect(endDate(trip('t1', '2026-03-03', 1))).toBe('2026-03-03')
  })

  test('a seven-day trip starting Mar 3 ends Mar 9', () => {
    expect(endDate(trip('t1', '2026-03-03', 7))).toBe('2026-03-09')
  })

  test('spans across a month boundary', () => {
    expect(endDate(trip('t1', '2026-03-30', 5))).toBe('2026-04-03')
  })

  test('handles a leap day', () => {
    expect(endDate(trip('t1', '2028-02-27', 4))).toBe('2028-03-01')
  })
})

describe('tripOverlaps', () => {
  test('trips in different months do not overlap', () => {
    expect(tripOverlaps(trip('a', '2026-03-01', 3), trip('b', '2026-05-01', 3))).toBe(false)
  })

  test('trips sharing a single day overlap', () => {
    // a runs Mar 1-3, b runs Mar 3-5: Mar 3 is double-booked
    expect(tripOverlaps(trip('a', '2026-03-01', 3), trip('b', '2026-03-03', 3))).toBe(true)
  })

  test('back-to-back trips with no shared day do not overlap', () => {
    // a runs Mar 1-3, b starts Mar 4
    expect(tripOverlaps(trip('a', '2026-03-01', 3), trip('b', '2026-03-04', 3))).toBe(false)
  })

  test('a trip fully containing another overlaps', () => {
    expect(tripOverlaps(trip('a', '2026-03-01', 30), trip('b', '2026-03-10', 2))).toBe(true)
  })

  test('overlap is symmetric', () => {
    const a = trip('a', '2026-03-01', 10)
    const b = trip('b', '2026-03-05', 10)
    expect(tripOverlaps(a, b)).toBe(tripOverlaps(b, a))
  })

  test('a trip does not overlap itself', () => {
    const a = trip('a', '2026-03-01', 5)
    expect(tripOverlaps(a, a)).toBe(false)
  })
})

describe('isPast', () => {
  test('a trip whose last day is before today is past', () => {
    expect(isPast(trip('a', '2026-03-01', 3), '2026-03-05')).toBe(true)
  })

  test('a trip ending today is not past', () => {
    expect(isPast(trip('a', '2026-03-01', 5), '2026-03-05')).toBe(false)
  })

  test('a future trip is not past', () => {
    expect(isPast(trip('a', '2026-09-01', 3), '2026-03-05')).toBe(false)
  })
})

describe('formatRange', () => {
  test('shows start, end and duration', () => {
    expect(formatRange(trip('a', '2026-03-03', 7))).toBe('3 Mar 2026 → 9 Mar 2026 · 7 days')
  })

  test('uses singular day for a one-day trip', () => {
    expect(formatRange(trip('a', '2026-03-03', 1))).toBe('3 Mar 2026 · 1 day')
  })
})
