import { describe, test, expect } from 'vitest'
import { unusedLeavers, removeUnusedLeavers } from './tidyLeavers'
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
