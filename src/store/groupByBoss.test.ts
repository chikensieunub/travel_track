import { describe, test, expect } from 'vitest'
import { bossSlots, cardSlots, cardSpan, groupByBoss, NO_BOSS, SLOT_COUNT } from './groupByBoss'
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

  test('every boss gets a colour, however many there are', () => {
    const many = roster(Array.from({ length: SLOT_COUNT + 6 }, (_, i) => `Boss${String(i).padStart(2, '0')}`))
    const slots = bossSlots(many)
    expect(slots.size).toBe(SLOT_COUNT + 6)
    expect([...slots.values()].every((s) => s >= 0 && s < SLOT_COUNT)).toBe(true)
  })

  test('colours start over once the palette is used up', () => {
    const many = roster(Array.from({ length: SLOT_COUNT + 2 }, (_, i) => `Boss${String(i).padStart(2, '0')}`))
    const slots = bossSlots(many)
    expect(slots.get(`Boss${String(SLOT_COUNT).padStart(2, '0')}`)).toBe(slots.get('Boss00'))
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

describe('cardSlots', () => {
  const many = (count: number): Member[] =>
    Array.from({ length: count }, (_, i) => member(`P${i}`, `Boss${String(i).padStart(2, '0')}`))

  test('gives each boss on the card its usual colour when nothing clashes', () => {
    const people = many(3)
    const resolved = cardSlots(people, ['Boss00', 'Boss01'])
    const base = bossSlots(people)
    expect(resolved.get('Boss00')).toBe(base.get('Boss00'))
    expect(resolved.get('Boss01')).toBe(base.get('Boss01'))
  })

  test('never gives two bosses on one card the same colour', () => {
    const people = many(SLOT_COUNT + 3)
    // Boss00 and Boss08 share a base colour once the palette wraps.
    const resolved = cardSlots(people, ['Boss00', `Boss${String(SLOT_COUNT).padStart(2, '0')}`])
    expect(resolved.get('Boss00')).not.toBe(resolved.get(`Boss${String(SLOT_COUNT).padStart(2, '0')}`))
  })

  test('every boss on the card gets a real colour, never the neutral slot', () => {
    const people = many(SLOT_COUNT + 4)
    const bosses = people.map((p) => p.directBoss).slice(0, 6)
    const resolved = cardSlots(people, bosses)
    expect([...resolved.values()].every((s) => s >= 0 && s < SLOT_COUNT)).toBe(true)
  })

  test('a clash shifts only the later boss, leaving the first on its usual colour', () => {
    const people = many(SLOT_COUNT + 3)
    const later = `Boss${String(SLOT_COUNT).padStart(2, '0')}`
    const resolved = cardSlots(people, ['Boss00', later])
    expect(resolved.get('Boss00')).toBe(bossSlots(people).get('Boss00'))
  })

  test('the same card always resolves the same way', () => {
    const people = many(SLOT_COUNT + 3)
    const bosses = ['Boss00', `Boss${String(SLOT_COUNT).padStart(2, '0')}`, 'Boss03']
    expect([...cardSlots(people, bosses)]).toEqual([...cardSlots(people, [...bosses].reverse())])
  })

  test('copes with more bosses on one card than there are colours', () => {
    const people = many(SLOT_COUNT + 4)
    const bosses = people.map((p) => p.directBoss)
    const resolved = cardSlots(people, bosses)
    expect(resolved.size).toBe(SLOT_COUNT + 4)
    expect([...resolved.values()].every((s) => s >= 0 && s < SLOT_COUNT)).toBe(true)
  })

  test('ignores a blank boss, which has no team and stays neutral', () => {
    const people = [member('Ana', ''), member('Dia', 'Ben')]
    const resolved = cardSlots(people, ['', 'Ben'])
    expect(resolved.has('')).toBe(false)
    expect(resolved.get('Ben')).toBe(0)
  })
})
