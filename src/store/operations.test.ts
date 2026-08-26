import { describe, test, expect } from 'vitest'
import {
  emptyData, addMember, updateMember, deleteMember,
  addTrip, updateTrip, deleteTrip,
  assign, unassign, moveAssignment,
  membersOnTrip, tripsForMember, conflictsFor,
} from './operations'
import type { TravelData } from './types'

const seed = (): TravelData => {
  let d = emptyData()
  d = addMember(d, { domainName: 'ACME\\acruz', fullName: 'Ana', location: 'Manila', directBoss: 'Ben' })
  d = addMember(d, { domainName: 'ACME\\bortiz', fullName: 'Ben', location: 'Cebu', directBoss: '' })
  d = addTrip(d, { destination: 'Tokyo', startDate: '2026-03-03', durationDays: 7 })
  d = addTrip(d, { destination: 'Berlin', startDate: '2026-03-08', durationDays: 4 })
  return d
}
const ana = (d: TravelData) => d.members.find((m) => m.fullName === 'Ana')!.id
const tokyo = (d: TravelData) => d.trips.find((t) => t.destination === 'Tokyo')!.id
const berlin = (d: TravelData) => d.trips.find((t) => t.destination === 'Berlin')!.id

describe('members', () => {
  test('adding a member gives it an id and defaults to active', () => {
    const d = addMember(emptyData(), { domainName: 'ACME\\acruz', fullName: 'Ana' })
    expect(d.members).toHaveLength(1)
    expect(d.members[0].id).toBeTruthy()
    expect(d.members[0].active).toBe(true)
  })

  test('adding a member does not mutate the original data', () => {
    const before = emptyData()
    addMember(before, { domainName: 'ACME\\acruz', fullName: 'Ana' })
    expect(before.members).toHaveLength(0)
  })

  test('updating a member changes only the named fields', () => {
    let d = seed()
    d = updateMember(d, ana(d), { location: 'Cebu' })
    const m = d.members.find((x) => x.id === ana(d))!
    expect(m.location).toBe('Cebu')
    expect(m.fullName).toBe('Ana')
  })

  test('deleting a member also removes their trip assignments', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    expect(d.assignments).toHaveLength(1)
    d = deleteMember(d, ana(d))
    expect(d.members).toHaveLength(1)
    expect(d.assignments).toHaveLength(0)
  })
})

describe('trips', () => {
  test('adding a trip defaults to planned status', () => {
    const d = addTrip(emptyData(), { destination: 'Lima', startDate: '2026-05-01', durationDays: 3 })
    expect(d.trips[0].status).toBe('planned')
  })

  test('a trip duration below one day is stored as one day', () => {
    const d = addTrip(emptyData(), { destination: 'Lima', startDate: '2026-05-01', durationDays: 0 })
    expect(d.trips[0].durationDays).toBe(1)
  })

  test('updating a trip changes only the named fields', () => {
    let d = seed()
    d = updateTrip(d, tokyo(d), { durationDays: 10 })
    const t = d.trips.find((x) => x.id === tokyo(d))!
    expect(t.durationDays).toBe(10)
    expect(t.destination).toBe('Tokyo')
  })

  test('deleting a trip also removes its assignments', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    d = deleteTrip(d, tokyo(d))
    expect(d.trips).toHaveLength(1)
    expect(d.assignments).toHaveLength(0)
  })
})

describe('assignment', () => {
  test('assigning a member to a trip records the pairing', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    expect(membersOnTrip(d, tokyo(d)).map((m) => m.fullName)).toEqual(['Ana'])
  })

  test('assigning the same member twice does not duplicate them', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    d = assign(d, tokyo(d), ana(d))
    expect(d.assignments).toHaveLength(1)
  })

  test('unassigning removes the member from that trip only', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    d = assign(d, berlin(d), ana(d))
    d = unassign(d, tokyo(d), ana(d))
    expect(membersOnTrip(d, tokyo(d))).toHaveLength(0)
    expect(membersOnTrip(d, berlin(d))).toHaveLength(1)
  })

  test('moving an assignment leaves the source trip and joins the target', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    d = moveAssignment(d, tokyo(d), berlin(d), ana(d))
    expect(membersOnTrip(d, tokyo(d))).toHaveLength(0)
    expect(membersOnTrip(d, berlin(d)).map((m) => m.fullName)).toEqual(['Ana'])
  })

  test('tripsForMember lists every trip the member is on', () => {
    let d = seed()
    d = assign(d, tokyo(d), ana(d))
    d = assign(d, berlin(d), ana(d))
    expect(tripsForMember(d, ana(d)).map((t) => t.destination).sort()).toEqual(['Berlin', 'Tokyo'])
  })

  test('assigning an unknown member is ignored', () => {
    const d = seed()
    expect(assign(d, tokyo(d), 'no-such-member').assignments).toHaveLength(0)
  })
})

describe('conflictsFor', () => {
  test('no conflict when the member is on no other trip', () => {
    const d = seed()
    expect(conflictsFor(d, tokyo(d), ana(d))).toEqual([])
  })

  test('reports the clashing trip when dates overlap', () => {
    let d = seed()
    // Tokyo runs Mar 3-9, Berlin starts Mar 8 - they share Mar 8 and 9
    d = assign(d, berlin(d), ana(d))
    expect(conflictsFor(d, tokyo(d), ana(d)).map((t) => t.destination)).toEqual(['Berlin'])
  })

  test('no conflict when the other trip is in a different month', () => {
    let d = seed()
    d = addTrip(d, { destination: 'Lima', startDate: '2026-09-01', durationDays: 3 })
    const lima = d.trips.find((t) => t.destination === 'Lima')!.id
    d = assign(d, lima, ana(d))
    expect(conflictsFor(d, tokyo(d), ana(d))).toEqual([])
  })
})
