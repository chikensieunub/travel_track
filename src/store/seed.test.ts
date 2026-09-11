import { describe, test, expect, vi } from 'vitest'

// The setup file stubs this module out, so the rest of the suite is not at the
// mercy of whatever board is baked in locally. Here we want the real thing.
vi.unmock('./seed')

const { seedFrom } = await vi.importActual<typeof import('./seed')>('./seed')

describe('seedFrom', () => {
  test('treats an empty backup as nothing to start from', () => {
    expect(seedFrom({ members: [], trips: [], assignments: [] })).toBeNull()
  })

  test('treats a missing file as nothing to start from', () => {
    expect(seedFrom(null)).toBeNull()
    expect(seedFrom({})).toBeNull()
  })

  test('uses a backup that holds members', () => {
    const seeded = seedFrom({
      schemaVersion: 3,
      members: [{ id: 'm1', domainName: 'A', fullName: 'Ana', directBoss: '', location: '', active: true }],
      trips: [],
      assignments: [],
    })
    expect(seeded?.members).toHaveLength(1)
  })

  test('uses a backup that holds only trips', () => {
    const seeded = seedFrom({
      schemaVersion: 3,
      members: [],
      trips: [{ id: 't1', destination: 'Tokyo', startDate: '2026-01-01', durationDays: 1, purpose: '', status: 'planned', notes: '' }],
      assignments: [],
    })
    expect(seeded?.trips).toHaveLength(1)
  })

  test('brings an older backup up to date on the way in', () => {
    const seeded = seedFrom({
      schemaVersion: 1,
      members: [{ id: 'm1', name: 'Ana Cruz', team: 'Manila', role: 'Tech', active: true }],
      trips: [],
      assignments: [],
    })
    expect(seeded?.members[0].fullName).toBe('Ana Cruz')
    expect(seeded?.schemaVersion).toBe(3)
  })
})
