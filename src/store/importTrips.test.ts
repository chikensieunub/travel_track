import { describe, test, expect } from 'vitest'
import { matchNames, applyTripImport, type TripImport } from './importTrips'
import { addMember, addTrip, assign, emptyData, membersOnTrip } from './operations'
import type { TravelData } from './types'

const rostered = (): TravelData => {
  let d = emptyData()
  d = addMember(d, { domainName: 'ACME-ntrung', fullName: 'Nguyễn Khánh Trung', directBoss: 'MINHND' })
  d = addMember(d, { domainName: 'ACME-nkhoa', fullName: 'Nguyễn Đăng Khoa', directBoss: 'MINHT2' })
  return d
}

const trip = (over: Partial<TripImport> = {}): TripImport => ({
  title: 'GDC 2026',
  startDate: '2026-05-01',
  durationDays: 3,
  names: ['Nguyễn Khánh Trung'],
  ...over,
})

describe('matchNames', () => {
  test('matches a name already in the roster', () => {
    const result = matchNames(rostered(), ['Nguyễn Khánh Trung'])
    expect(result.matched).toHaveLength(1)
    expect(result.unmatched).toHaveLength(0)
  })

  test('matches whatever the casing', () => {
    expect(matchNames(rostered(), ['nguyễn khánh trung']).matched).toHaveLength(1)
  })

  test('matches despite extra spacing', () => {
    expect(matchNames(rostered(), ['  Nguyễn   Khánh Trung ']).matched).toHaveLength(1)
  })

  test('treats names differing only by accent as different people', () => {
    // Diacritics carry meaning in Vietnamese names, so they must not be stripped.
    expect(matchNames(rostered(), ['Nguyen Khanh Trung']).unmatched).toEqual(['Nguyen Khanh Trung'])
  })

  test('reports a name that is not in the roster', () => {
    expect(matchNames(rostered(), ['Lê Duy']).unmatched).toEqual(['Lê Duy'])
  })

  test('splits a mixed list into matched and unmatched', () => {
    const result = matchNames(rostered(), ['Nguyễn Khánh Trung', 'Lê Duy'])
    expect(result.matched).toHaveLength(1)
    expect(result.unmatched).toEqual(['Lê Duy'])
  })

  test('does not match someone who has left, since they are still in the roster', () => {
    let d = rostered()
    d = { ...d, members: d.members.map((m) => ({ ...m, active: false })) }
    expect(matchNames(d, ['Nguyễn Khánh Trung']).matched).toHaveLength(1)
  })
})

describe('applyTripImport', () => {
  test('adds a trip that was not there before', () => {
    const result = applyTripImport(rostered(), [trip()])
    expect(result.data.trips).toHaveLength(1)
    expect(result.data.trips[0].destination).toBe('GDC 2026')
    expect(result.tripsAdded).toBe(1)
  })

  test('uses the dates given for the trip', () => {
    const result = applyTripImport(rostered(), [trip({ startDate: '2026-05-04', durationDays: 5 })])
    expect(result.data.trips[0].startDate).toBe('2026-05-04')
    expect(result.data.trips[0].durationDays).toBe(5)
  })

  test('puts the matched people on the trip', () => {
    const result = applyTripImport(rostered(), [trip({ names: ['Nguyễn Khánh Trung', 'Nguyễn Đăng Khoa'] })])
    expect(membersOnTrip(result.data, result.data.trips[0].id)).toHaveLength(2)
  })

  test('adds an unknown person to the roster as having left', () => {
    const result = applyTripImport(rostered(), [trip({ names: ['Lê Duy'] })])
    const added = result.data.members.find((m) => m.fullName === 'Lê Duy')!
    expect(added).toBeDefined()
    expect(added.active).toBe(false)
    expect(result.membersAdded).toBe(1)
  })

  test('puts a person who left on the trip too, so history is complete', () => {
    const result = applyTripImport(rostered(), [trip({ names: ['Lê Duy'] })])
    expect(membersOnTrip(result.data, result.data.trips[0].id).map((m) => m.fullName)).toEqual(['Lê Duy'])
  })

  test('does not add the same leaver twice across two trips', () => {
    const result = applyTripImport(rostered(), [
      trip({ title: 'GDC 2026', names: ['Lê Duy'] }),
      trip({ title: 'GDC 2025', names: ['Lê Duy'] }),
    ])
    expect(result.data.members.filter((m) => m.fullName === 'Lê Duy')).toHaveLength(1)
    expect(result.membersAdded).toBe(1)
  })

  test('leaves people already in the roster alone', () => {
    const before = rostered()
    const result = applyTripImport(before, [trip()])
    expect(result.data.members).toHaveLength(before.members.length)
    expect(result.membersAdded).toBe(0)
  })

  test('updates a trip that already exists by name rather than duplicating it', () => {
    let d = rostered()
    d = addTrip(d, { destination: 'GDC 2026', startDate: '2026-01-01', durationDays: 1 })
    const result = applyTripImport(d, [trip({ names: ['Nguyễn Đăng Khoa'] })])
    expect(result.data.trips).toHaveLength(1)
    expect(result.tripsUpdated).toBe(1)
    expect(result.tripsAdded).toBe(0)
  })

  test('keeps the dates already set on an existing trip', () => {
    let d = rostered()
    d = addTrip(d, { destination: 'GDC 2026', startDate: '2026-07-07', durationDays: 9 })
    const result = applyTripImport(d, [trip({ startDate: '2026-01-01', durationDays: 1 })])
    expect(result.data.trips[0].startDate).toBe('2026-07-07')
    expect(result.data.trips[0].durationDays).toBe(9)
  })

  test('refreshes the people on an existing trip from the file', () => {
    let d = rostered()
    d = addTrip(d, { destination: 'GDC 2026', startDate: '2026-01-01', durationDays: 1 })
    d = assign(d, d.trips[0].id, d.members[0].id)
    const result = applyTripImport(d, [trip({ names: ['Nguyễn Đăng Khoa'] })])
    expect(membersOnTrip(result.data, result.data.trips[0].id).map((m) => m.fullName)).toEqual(['Nguyễn Đăng Khoa'])
  })

  test('matches an existing trip name whatever the casing', () => {
    let d = rostered()
    d = addTrip(d, { destination: 'gdc 2026', startDate: '2026-01-01', durationDays: 1 })
    expect(applyTripImport(d, [trip()]).data.trips).toHaveLength(1)
  })

  test('imports several trips at once', () => {
    const result = applyTripImport(rostered(), [trip({ title: 'GDC 2026' }), trip({ title: 'GDC 2025' })])
    expect(result.data.trips.map((t) => t.destination).sort()).toEqual(['GDC 2025', 'GDC 2026'])
  })

  test('does not mutate the data it was given', () => {
    const before = rostered()
    applyTripImport(before, [trip()])
    expect(before.trips).toHaveLength(0)
  })

  test('importing nothing changes nothing', () => {
    const before = rostered()
    const result = applyTripImport(before, [])
    expect(result.data).toEqual(before)
    expect(result.tripsAdded).toBe(0)
  })
})
