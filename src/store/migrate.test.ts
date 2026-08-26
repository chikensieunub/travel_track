import { describe, test, expect } from 'vitest'
import { migrate } from './migrate'

const v1 = {
  schemaVersion: 1,
  members: [
    { id: 'm1', name: 'Ana Cruz', team: 'Engineering', role: 'Field Tech', active: true },
    { id: 'm2', name: 'Ben Ortiz', team: '', role: '', active: false },
  ],
  trips: [
    {
      id: 't1',
      destination: 'Tokyo',
      startDate: '2026-10-05',
      durationDays: 7,
      purpose: 'Install',
      status: 'planned',
      notes: '',
    },
  ],
  assignments: [{ id: 'a1', tripId: 't1', memberId: 'm1' }],
}

describe('migrate', () => {
  test('carries the old name over as the full name', () => {
    expect(migrate(v1).members[0].fullName).toBe('Ana Cruz')
  })

  test('seeds the domain name from the old name, since it is the new key', () => {
    expect(migrate(v1).members[0].domainName).toBe('Ana Cruz')
  })

  test('carries the old team over as the location', () => {
    expect(migrate(v1).members[0].location).toBe('Engineering')
  })

  test('leaves the direct boss blank, as v1 never recorded one', () => {
    expect(migrate(v1).members[0].directBoss).toBe('')
  })

  test('preserves member ids so assignments still resolve', () => {
    const result = migrate(v1)
    expect(result.members[0].id).toBe('m1')
    expect(result.assignments).toEqual(v1.assignments)
  })

  test('preserves whether a member had left', () => {
    expect(migrate(v1).members[1].active).toBe(false)
  })

  test('leaves trips untouched', () => {
    expect(migrate(v1).trips).toEqual(v1.trips)
  })

  test('stamps the current schema version', () => {
    expect(migrate(v1).schemaVersion).toBe(2)
  })

  test('leaves data that is already current alone', () => {
    const current = {
      schemaVersion: 2,
      members: [
        { id: 'm1', domainName: 'ACME\\acruz', fullName: 'Ana Cruz', directBoss: 'Ben', location: 'Manila', active: true },
      ],
      trips: [],
      assignments: [],
    }
    expect(migrate(current)).toEqual(current)
  })

  test('treats data with no version as v1', () => {
    const noVersion = { members: [{ id: 'm1', name: 'Ana', team: 'Eng', role: 'Tech', active: true }], trips: [], assignments: [] }
    expect(migrate(noVersion).members[0].fullName).toBe('Ana')
  })
})
