import { describe, test, expect } from 'vitest'
import { addMember, addTrip, assign, emptyData, membersOnTrip } from './operations'
import { setAssignmentStatus, membersOnTripByStatus, assignmentStatus } from './operations'
import type { TravelData } from './types'

const seeded = (): TravelData => {
  let d = addMember(emptyData(), { domainName: 'A', fullName: 'Ana', directBoss: 'Ben' })
  d = addMember(d, { domainName: 'B', fullName: 'Chen', directBoss: 'Ben' })
  d = addTrip(d, { destination: 'Tokyo', startDate: '2026-10-05', durationDays: 3 })
  return d
}
const trip = (d: TravelData) => d.trips[0].id
const ana = (d: TravelData) => d.members.find((m) => m.fullName === 'Ana')!.id
const chen = (d: TravelData) => d.members.find((m) => m.fullName === 'Chen')!.id

describe('assignment status', () => {
  test('someone added to a trip is confirmed by default', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    expect(assignmentStatus(d, trip(d), ana(d))).toBe('confirmed')
  })

  test('a member can be moved down to tentative', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    d = setAssignmentStatus(d, trip(d), ana(d), 'tentative')
    expect(assignmentStatus(d, trip(d), ana(d))).toBe('tentative')
  })

  test('a tentative member can be moved back up to confirmed', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    d = setAssignmentStatus(d, trip(d), ana(d), 'tentative')
    d = setAssignmentStatus(d, trip(d), ana(d), 'confirmed')
    expect(assignmentStatus(d, trip(d), ana(d))).toBe('confirmed')
  })

  test('moving one member does not disturb another', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    d = assign(d, trip(d), chen(d))
    d = setAssignmentStatus(d, trip(d), ana(d), 'tentative')
    expect(assignmentStatus(d, trip(d), chen(d))).toBe('confirmed')
  })

  test('an explicit status can be given when assigning', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d), 'tentative')
    expect(assignmentStatus(d, trip(d), ana(d))).toBe('tentative')
  })

  test('assigning someone already on the trip updates their status instead of duplicating', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    d = assign(d, trip(d), ana(d), 'tentative')
    expect(d.assignments).toHaveLength(1)
    expect(assignmentStatus(d, trip(d), ana(d))).toBe('tentative')
  })

  test('membersOnTrip still returns everyone, whatever their status', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    d = assign(d, trip(d), chen(d), 'tentative')
    expect(membersOnTrip(d, trip(d))).toHaveLength(2)
  })

  test('members can be listed by status', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    d = assign(d, trip(d), chen(d), 'tentative')
    expect(membersOnTripByStatus(d, trip(d), 'confirmed').map((m) => m.fullName)).toEqual(['Ana'])
    expect(membersOnTripByStatus(d, trip(d), 'tentative').map((m) => m.fullName)).toEqual(['Chen'])
  })

  test('an assignment with no status recorded reads as confirmed', () => {
    let d = seeded()
    d = assign(d, trip(d), ana(d))
    // Simulate data written before statuses existed.
    d = { ...d, assignments: d.assignments.map(({ id, tripId, memberId }) => ({ id, tripId, memberId })) }
    expect(assignmentStatus(d, trip(d), ana(d))).toBe('confirmed')
    expect(membersOnTripByStatus(d, trip(d), 'confirmed')).toHaveLength(1)
  })

  test('setting a status for someone not on the trip changes nothing', () => {
    const d = seeded()
    expect(setAssignmentStatus(d, trip(d), ana(d), 'tentative')).toEqual(d)
  })
})
