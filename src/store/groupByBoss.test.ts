import { describe, test, expect } from 'vitest'
import { bossSlots, cardSpan, groupByBoss, NO_BOSS, OTHER_SLOT, SLOT_COUNT } from './groupByBoss'
import type { Member } from './types'

const member = (fullName: string, directBoss: string): Member => ({
  id: fullName,
  domainName: `ACME\\${fullName}`,
  fullName,
  directBoss,
  location: '',
  active: true,
})

describe('groupByBoss', () => {
  test('puts everyone reporting to the same boss in one group', () => {
    const groups = groupByBoss([member('Ana', 'Ben'), member('Chen', 'Ben')])
    expect(groups).toHaveLength(1)
    expect(groups[0].boss).toBe('Ben')
    expect(groups[0].members.map((m) => m.fullName)).toEqual(['Ana', 'Chen'])
  })

  test('separates people who report to different bosses', () => {
    const groups = groupByBoss([member('Ana', 'Ben'), member('Dia', 'Eve')])
    expect(groups.map((g) => g.boss)).toEqual(['Ben', 'Eve'])
  })

  test('orders groups by boss name so cards read consistently', () => {
    const groups = groupByBoss([member('Ana', 'Zoe'), member('Dia', 'Ben')])
    expect(groups.map((g) => g.boss)).toEqual(['Ben', 'Zoe'])
  })

  test('sorts members within a group by name', () => {
    const groups = groupByBoss([member('Zara', 'Ben'), member('Ana', 'Ben')])
    expect(groups[0].members.map((m) => m.fullName)).toEqual(['Ana', 'Zara'])
  })

  test('collects people with no boss recorded into their own group, last', () => {
    const groups = groupByBoss([member('Ana', ''), member('Dia', 'Ben')])
    expect(groups.map((g) => g.boss)).toEqual(['Ben', NO_BOSS])
  })

  test('counts the members in each group', () => {
    const groups = groupByBoss([member('Ana', 'Ben'), member('Chen', 'Ben'), member('Dia', 'Eve')])
    expect(groups.map((g) => g.members.length)).toEqual([2, 1])
  })

  test('an empty list produces no groups', () => {
    expect(groupByBoss([])).toEqual([])
  })
})

describe('bossSlots', () => {
  const roster = (bosses: string[]): Member[] => bosses.map((b, i) => member(`P${i}`, b))

  test('gives each boss a colour slot', () => {
    const slots = bossSlots(roster(['Ben', 'Eve']))
    expect(slots.get('Ben')).toBe(0)
    expect(slots.get('Eve')).toBe(1)
  })

  test('assigns slots by boss name, so a boss keeps their colour on every card', () => {
    // Same two bosses, discovered in the opposite order.
    const forwards = bossSlots(roster(['Ben', 'Eve']))
    const backwards = bossSlots(roster(['Eve', 'Ben']))
    expect(backwards.get('Ben')).toBe(forwards.get('Ben'))
    expect(backwards.get('Eve')).toBe(forwards.get('Eve'))
  })

  test('a boss keeps their slot when someone else is removed from the roster', () => {
    const before = bossSlots(roster(['Ben', 'Eve', 'Zoe']))
    const after = bossSlots(roster(['Ben', 'Zoe']))
    expect(after.get('Ben')).toBe(before.get('Ben'))
  })

  test('does not reuse a colour once the palette runs out', () => {
    const many = roster(Array.from({ length: SLOT_COUNT + 3 }, (_, i) => `Boss${String(i).padStart(2, '0')}`))
    const slots = bossSlots(many)
    const used = [...slots.values()].filter((s) => s !== OTHER_SLOT)
    expect(new Set(used).size).toBe(used.length)
    expect(used.length).toBe(SLOT_COUNT)
  })

  test('bosses past the palette share a neutral slot rather than a repeated colour', () => {
    const many = roster(Array.from({ length: SLOT_COUNT + 2 }, (_, i) => `Boss${String(i).padStart(2, '0')}`))
    const slots = bossSlots(many)
    expect(slots.get(`Boss${String(SLOT_COUNT).padStart(2, '0')}`)).toBe(OTHER_SLOT)
  })

  test('ignores members with no boss recorded', () => {
    const slots = bossSlots([member('Ana', ''), member('Dia', 'Ben')])
    expect(slots.has('')).toBe(false)
    expect(slots.get('Ben')).toBe(0)
  })
})

describe('cardSpan', () => {
  test('a trip with a couple of people stays one column wide', () => {
    expect(cardSpan(2, 1)).toBe(1)
  })

  test('an empty trip stays one column wide', () => {
    expect(cardSpan(0, 0)).toBe(1)
  })

  test('a middling trip widens to two columns', () => {
    expect(cardSpan(8, 3)).toBe(2)
  })

  test('a busy trip widens to three columns', () => {
    expect(cardSpan(18, 5)).toBe(3)
  })

  test('never grows past three, so one trip cannot swallow the board', () => {
    expect(cardSpan(200, 40)).toBe(3)
  })

  test('many small groups count towards width, since each carries a heading', () => {
    // The same five people split five ways need more room than five under one boss.
    expect(cardSpan(5, 5)).toBeGreaterThan(cardSpan(5, 1))
  })

  test('width never shrinks when someone is added', () => {
    for (let n = 0; n < 30; n += 1) {
      expect(cardSpan(n + 1, 2)).toBeGreaterThanOrEqual(cardSpan(n, 2))
    }
  })
})
