import { describe, test, expect } from 'vitest'
import { mergeMembers, previewMerge } from './mergeMembers'
import { addMember, addTrip, assign, emptyData, membersOnTrip } from './operations'
import type { MemberDraft, TravelData } from './types'

const draft = (domainName: string, over: Partial<MemberDraft> = {}): MemberDraft => ({
  domainName,
  fullName: domainName,
  directBoss: '',
  location: '',
  active: true,
  ...over,
})

const seeded = (): TravelData =>
  addMember(emptyData(), draft('ACME\\acruz', { fullName: 'Ana Cruz', location: 'Manila', directBoss: 'Ben Ortiz' }))

describe('mergeMembers', () => {
  test('adds someone the roster has never seen', () => {
    const result = mergeMembers(emptyData(), [draft('ACME\\acruz', { fullName: 'Ana Cruz' })])
    expect(result.data.members).toHaveLength(1)
    expect(result.added).toBe(1)
    expect(result.updated).toBe(0)
  })

  test('updates an existing member rather than duplicating them', () => {
    const result = mergeMembers(seeded(), [draft('ACME\\acruz', { fullName: 'Ana Cruz', location: 'Cebu' })])
    expect(result.data.members).toHaveLength(1)
    expect(result.data.members[0].location).toBe('Cebu')
    expect(result.added).toBe(0)
    expect(result.updated).toBe(1)
  })

  test('matches an existing member whatever the casing of the domain name', () => {
    const result = mergeMembers(seeded(), [draft('acme\\ACRUZ', { fullName: 'Ana Cruz', location: 'Cebu' })])
    expect(result.data.members).toHaveLength(1)
    expect(result.updated).toBe(1)
  })

  test('keeps the existing id so trip assignments survive an update', () => {
    let data = seeded()
    data = addTrip(data, { destination: 'Tokyo', startDate: '2026-10-05', durationDays: 3 })
    const tripId = data.trips[0].id
    data = assign(data, tripId, data.members[0].id)

    const result = mergeMembers(data, [draft('ACME\\acruz', { fullName: 'Ana Cruz', location: 'Cebu' })])
    expect(membersOnTrip(result.data, tripId).map((m) => m.fullName)).toEqual(['Ana Cruz'])
  })

  test('leaves members who are absent from the file completely alone', () => {
    const data = addMember(seeded(), draft('ACME\\bortiz', { fullName: 'Ben Ortiz' }))
    const result = mergeMembers(data, [draft('ACME\\acruz', { fullName: 'Ana Cruz', location: 'Cebu' })])
    expect(result.data.members).toHaveLength(2)
    expect(result.data.members.find((m) => m.fullName === 'Ben Ortiz')).toBeDefined()
  })

  test('does not reactivate a member who was marked as having left', () => {
    let data = seeded()
    data = { ...data, members: data.members.map((m) => ({ ...m, active: false })) }
    const result = mergeMembers(data, [draft('ACME\\acruz', { fullName: 'Ana Cruz' })])
    expect(result.data.members[0].active).toBe(false)
  })

  test('does not mutate the data it was given', () => {
    const before = seeded()
    mergeMembers(before, [draft('ACME\\acruz', { location: 'Cebu' })])
    expect(before.members[0].location).toBe('Manila')
  })

  test('an empty file changes nothing', () => {
    const result = mergeMembers(seeded(), [])
    expect(result.added).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.data.members).toHaveLength(1)
  })
})

describe('previewMerge', () => {
  test('reports what an import would do without doing it', () => {
    const data = seeded()
    const preview = previewMerge(data, [
      draft('ACME\\acruz', { location: 'Cebu' }),
      draft('ACME\\cwong', { fullName: 'Chen Wong' }),
    ])
    expect(preview).toEqual({ added: 1, updated: 1 })
    expect(data.members).toHaveLength(1)
  })
})
