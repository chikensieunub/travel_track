import { describe, test, expect } from 'vitest'
import { unusedLeavers, removeUnusedLeavers, strays, absorbStrays, tidySummary } from './tidyLeavers'
import { addMember, addTrip, assign, emptyData } from './operations'
import type { TravelData } from './types'

function built(): TravelData {
  let d = emptyData()
  d = addMember(d, { domainName: 'A', fullName: 'Ana', active: true })
  d = addMember(d, { domainName: 'B', fullName: 'Ben', active: false })
  d = addMember(d, { domainName: 'C', fullName: 'Chen', active: false })
  d = addTrip(d, { destination: 'Tokyo', startDate: '2026-10-05', durationDays: 3 })
  // Chen went on the trip; Ben is a leftover record attached to nothing.
  d = assign(d, d.trips[0].id, d.members.find((m) => m.fullName === 'Chen')!.id)
  return d
}

describe('unusedLeavers', () => {
  test('finds people marked as left who are on no trips', () => {
    expect(unusedLeavers(built()).map((m) => m.fullName)).toEqual(['Ben'])
  })

  test('leaves alone a leaver who is on a trip, since that is real history', () => {
    expect(unusedLeavers(built()).map((m) => m.fullName)).not.toContain('Chen')
  })

  test('never touches current staff, even with no trips', () => {
    expect(unusedLeavers(built()).map((m) => m.fullName)).not.toContain('Ana')
  })

  test('finds nobody in tidy data', () => {
    let d = emptyData()
    d = addMember(d, { domainName: 'A', fullName: 'Ana' })
    expect(unusedLeavers(d)).toEqual([])
  })
})

describe('removeUnusedLeavers', () => {
  test('removes exactly those records', () => {
    const result = removeUnusedLeavers(built())
    expect(result.data.members.map((m) => m.fullName).sort()).toEqual(['Ana', 'Chen'])
    expect(result.removed).toBe(1)
  })

  test('keeps every trip and assignment intact', () => {
    const before = built()
    const result = removeUnusedLeavers(before)
    expect(result.data.trips).toEqual(before.trips)
    expect(result.data.assignments).toEqual(before.assignments)
  })

  test('changes nothing when there is nothing to remove', () => {
    let d = emptyData()
    d = addMember(d, { domainName: 'A', fullName: 'Ana' })
    const result = removeUnusedLeavers(d)
    expect(result.data).toEqual(d)
    expect(result.removed).toBe(0)
  })

  test('does not mutate the data it was given', () => {
    const before = built()
    removeUnusedLeavers(before)
    expect(before.members).toHaveLength(3)
  })
})

describe('strays that shadow someone still here', () => {
  const NAME = 'Đôn Thị Thuý Hằng'

  /** One real person, plus the stray a failed match left behind, on a trip. */
  function shadowed(): TravelData {
    let d = emptyData()
    d = addMember(d, { domainName: 'ACME-dtth', fullName: NAME, directBoss: 'MINHND', active: true })
    d = addMember(d, { domainName: NAME, fullName: NAME, active: false })
    d = addTrip(d, { destination: 'GDC 2026', startDate: '2026-01-01', durationDays: 1 })
    const stray = d.members.find((m) => !m.active)!
    d = assign(d, d.trips[0].id, stray.id)
    return d
  }

  test('finds a stray even though it is on a trip, because the real person exists', () => {
    expect(strays(shadowed()).map((m) => m.fullName)).toEqual([NAME])
  })

  test('does not call someone a stray when nobody else has their name', () => {
    let d = emptyData()
    d = addMember(d, { domainName: 'X', fullName: 'Long Gone', active: false })
    d = addTrip(d, { destination: 'T', startDate: '2026-01-01', durationDays: 1 })
    d = assign(d, d.trips[0].id, d.members[0].id)
    expect(strays(d)).toEqual([])
  })

  test('matches across tone-mark placement, which is how they arose', () => {
    let d = emptyData()
    d = addMember(d, { domainName: 'A', fullName: 'Đôn Thị Thúy Hằng', active: true })
    d = addMember(d, { domainName: 'B', fullName: 'Đôn Thị Thuý Hằng', active: false })
    expect(strays(d)).toHaveLength(1)
  })

  test('moves the stray trips onto the person who is still here', () => {
    const result = absorbStrays(shadowed())
    const real = result.data.members.find((m) => m.active)!
    expect(result.data.assignments.map((a) => a.memberId)).toEqual([real.id])
  })

  test('removes the stray record', () => {
    const result = absorbStrays(shadowed())
    expect(result.data.members).toHaveLength(1)
    expect(result.absorbed).toBe(1)
  })

  test('keeps the trip itself', () => {
    const result = absorbStrays(shadowed())
    expect(result.data.trips).toHaveLength(1)
  })

  test('does not double-assign when both records were on the same trip', () => {
    let d = shadowed()
    const real = d.members.find((m) => m.active)!
    d = assign(d, d.trips[0].id, real.id)
    const result = absorbStrays(d)
    expect(result.data.assignments).toHaveLength(1)
  })

  test('changes nothing when there are no strays', () => {
    let d = emptyData()
    d = addMember(d, { domainName: 'A', fullName: 'Ana' })
    const result = absorbStrays(d)
    expect(result.data).toEqual(d)
    expect(result.absorbed).toBe(0)
  })

  test('does not mutate the data it was given', () => {
    const before = shadowed()
    absorbStrays(before)
    expect(before.members).toHaveLength(2)
  })
})

describe('tidySummary', () => {
  const NAME = 'Đôn Thị Thuý Hằng'

  function shadowedAndEmpty(): TravelData {
    let d = emptyData()
    d = addMember(d, { domainName: 'A', fullName: NAME, active: true })
    d = addMember(d, { domainName: 'B', fullName: NAME, active: false })
    d = addMember(d, { domainName: 'C', fullName: 'Long Gone', active: false })
    d = addTrip(d, { destination: 'GDC', startDate: '2026-01-01', durationDays: 1 })
    d = assign(d, d.trips[0].id, d.members.find((m) => m.domainName === 'B')!.id)
    return d
  }

  test('names the duplicates it will fold in', () => {
    expect(tidySummary(shadowedAndEmpty())).toContain(NAME)
  })

  test('names the records that are attached to nothing', () => {
    expect(tidySummary(shadowedAndEmpty())).toContain('Long Gone')
  })

  test('promises that no trip loses anyone', () => {
    expect(tidySummary(shadowedAndEmpty())).toMatch(/no trip loses anyone/i)
  })

  test('separates the two kinds, since they are handled differently', () => {
    const text = tidySummary(shadowedAndEmpty())
    expect(text).toMatch(/trips move across/i)
    expect(text).toMatch(/on no trips/i)
  })

  test('mentions only what applies', () => {
    let d = emptyData()
    d = addMember(d, { domainName: 'C', fullName: 'Long Gone', active: false })
    expect(tidySummary(d)).not.toMatch(/trips move across/i)
  })
})
