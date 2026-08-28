import { describe, test, expect } from 'vitest'
import { teamCoverage } from './teamCoverage'
import type { Member } from './types'

const member = (fullName: string, directBoss: string, active = true): Member => ({
  id: fullName,
  domainName: fullName,
  fullName,
  directBoss,
  location: '',
  active,
})

const roster = [
  member('Ana', 'Ben'),
  member('Chen', 'Ben'),
  member('Dia', 'Ben'),
  member('Eve', 'Gus'),
]

describe('teamCoverage', () => {
  test('counts how many of a boss team are confirmed', () => {
    const c = teamCoverage(roster, 'Ben', ['Ana', 'Chen'])
    expect(c.confirmed).toBe(2)
    expect(c.teamSize).toBe(3)
  })

  test('works out the percentage', () => {
    expect(teamCoverage(roster, 'Ben', ['Ana', 'Chen']).percent).toBe(67)
  })

  test('a whole team going reads as 100%', () => {
    expect(teamCoverage(roster, 'Ben', ['Ana', 'Chen', 'Dia']).percent).toBe(100)
  })

  test('nobody going reads as 0%', () => {
    expect(teamCoverage(roster, 'Ben', []).percent).toBe(0)
  })

  test('only counts the boss being asked about', () => {
    expect(teamCoverage(roster, 'Gus', ['Eve']).teamSize).toBe(1)
  })

  test('leavers are left out of the team size', () => {
    const withLeaver = [...roster, member('Zoe', 'Ben', false)]
    expect(teamCoverage(withLeaver, 'Ben', ['Ana']).teamSize).toBe(3)
  })

  test('a leaver still on the trip counts on both sides, so it never exceeds 100%', () => {
    const withLeaver = [...roster, member('Zoe', 'Ben', false)]
    const c = teamCoverage(withLeaver, 'Ben', ['Ana', 'Chen', 'Dia', 'Zoe'])
    expect(c.confirmed).toBe(4)
    expect(c.teamSize).toBe(4)
    expect(c.percent).toBe(100)
  })

  test('members with no boss recorded form their own team', () => {
    const list = [member('Ana', ''), member('Chen', ''), member('Dia', 'Ben')]
    expect(teamCoverage(list, '', ['Ana']).teamSize).toBe(2)
  })

  test('ignores whitespace around a boss name', () => {
    const list = [member('Ana', ' Ben '), member('Chen', 'Ben')]
    expect(teamCoverage(list, 'Ben', ['Ana']).teamSize).toBe(2)
  })

  test('an unknown boss has no team and no percentage', () => {
    const c = teamCoverage(roster, 'Nobody', [])
    expect(c.teamSize).toBe(0)
    expect(c.percent).toBe(0)
  })

  test('rounds to whole percents', () => {
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => member(n, 'Ben'))
    expect(teamCoverage(six, 'Ben', ['a']).percent).toBe(17)
  })
})
