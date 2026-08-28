import type { Member } from './types'

/** Group heading used for members whose direct boss was never recorded. */
export const NO_BOSS = ''

/** How many distinct colours the categorical palette offers. */
export const SLOT_COUNT = 8

/** Used for the "no boss recorded" column, which is an absence rather than a team. */
export const OTHER_SLOT = -1

export interface BossGroup {
  boss: string
  members: Member[]
}

const byName = (a: Member, b: Member): number => a.fullName.localeCompare(b.fullName)

/**
 * Split members into one group per direct boss, ordered by boss name so a card
 * reads the same way every time. People with no boss recorded come last.
 */
export function groupByBoss(members: Member[]): BossGroup[] {
  const groups = new Map<string, Member[]>()
  for (const m of members) {
    const boss = m.directBoss.trim()
    const bucket = groups.get(boss)
    if (bucket) bucket.push(m)
    else groups.set(boss, [m])
  }

  return [...groups.entries()]
    .map(([boss, list]) => ({ boss, members: [...list].sort(byName) }))
    .sort((a, b) => {
      if (a.boss === NO_BOSS) return 1
      if (b.boss === NO_BOSS) return -1
      return a.boss.localeCompare(b.boss)
    })
}

/**
 * Map each boss to their usual colour slot.
 *
 * Slots follow the boss's name, not the order they happen to appear in, so one
 * boss wears the same colour wherever possible and adding or removing people
 * never repaints anyone else. Past the eighth boss the palette starts over -
 * a shared colour across two cards reads far better than a grey column.
 */
export function bossSlots(members: Member[]): Map<string, number> {
  const names = [...new Set(members.map((m) => m.directBoss.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
  return new Map(names.map((name, index) => [name, index % SLOT_COUNT]))
}

/**
 * Colours for the bosses appearing on one card.
 *
 * Each takes their usual slot; if that is already spoken for on this card, they
 * shift to the next free one. So nobody is grey, no two teams on a card share a
 * colour, and a boss only moves off their usual colour where it would clash.
 */
export function cardSlots(allMembers: Member[], bossesOnCard: string[]): Map<string, number> {
  const base = bossSlots(allMembers)
  const taken = new Set<number>()
  const resolved = new Map<string, number>()

  // Sorted so a card resolves the same way however its groups arrive.
  const names = [...new Set(bossesOnCard.map((b) => b.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  for (const name of names) {
    const want = base.get(name) ?? 0
    let slot = want
    for (let step = 0; step < SLOT_COUNT && taken.has(slot); step += 1) {
      slot = (want + step + 1) % SLOT_COUNT
    }
    // With more teams on one card than colours, a repeat is unavoidable.
    taken.add(slot)
    resolved.set(name, slot)
  }

  return resolved
}

/** Board columns a trip card spans. Wider cards mean shorter ones. */
export const MAX_SPAN = 3

/** Rows a single board column holds comfortably before a card looks too tall. */
const ROWS_PER_COLUMN = 6

/**
 * How wide a trip card should be, from how much it has to show.
 *
 * Each member is a row and each group costs a heading row, so a handful of
 * one-person groups takes as much room as one crowded group. Capped so a single
 * trip never swallows the whole board.
 */
export function cardSpan(memberCount: number, groupCount: number): number {
  const rows = memberCount + groupCount
  return Math.min(Math.max(Math.ceil(rows / ROWS_PER_COLUMN), 1), MAX_SPAN)
}
