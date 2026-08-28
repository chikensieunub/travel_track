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
    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]).toMatchObject({ id: 'a1', tripId: 't1', memberId: 'm1' })
  })

  test('preserves whether a member had left', () => {
    expect(migrate(v1).members[1].active).toBe(false)
  })

  test('leaves trips untouched', () => {
    expect(migrate(v1).trips).toEqual(v1.trips)
  })

  test('stamps the current schema version', () => {
    expect(migrate(v1).schemaVersion).toBe(3)
  })

  test('leaves data that is already current alone', () => {
    const current = {
      schemaVersion: 3,
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

const v2 = {
  schemaVersion: 2,
  members: [
    { id: 'm1', domainName: 'ACME\\acruz', fullName: 'Ana Cruz', directBoss: 'Ben', location: 'Manila', active: true },
  ],
  trips: [
    { id: 't1', destination: 'Tokyo', startDate: '2026-10-05', durationDays: 7, purpose: '', status: 'planned', notes: '' },
  ],
  assignments: [{ id: 'a1', tripId: 't1', memberId: 'm1' }],
}

describe('migrate from v2', () => {
  test('leaves v2 members exactly as they are', () => {
    expect(migrate(v2).members[0]).toEqual(v2.members[0])
  })

  test('does not mangle a v2 member into the old name/team shape', () => {
    const migrated = migrate(v2).members[0]
    expect(migrated.domainName).toBe('ACME\\acruz')
    expect(migrated.fullName).toBe('Ana Cruz')
    expect(migrated.location).toBe('Manila')
  })

  test('marks existing assignments confirmed, since they were already planned', () => {
    expect(migrate(v2).assignments[0].status).toBe('confirmed')
  })

  test('keeps assignments pointing at the same trip and member', () => {
    const a = migrate(v2).assignments[0]
    expect(a.tripId).toBe('t1')
    expect(a.memberId).toBe('m1')
  })

  test('stamps the current schema version', () => {
    expect(migrate(v2).schemaVersion).toBe(3)
  })

  test('a v1 upgrade also lands on confirmed assignments', () => {
    expect(migrate(v1).assignments[0].status).toBe('confirmed')
  })

  test('leaves a status that was already set alone', () => {
    const v3 = { ...v2, schemaVersion: 3, assignments: [{ ...v2.assignments[0], status: 'tentative' }] }
    expect(migrate(v3).assignments[0].status).toBe('tentative')
  })
})
