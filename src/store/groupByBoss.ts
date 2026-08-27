import type { Member } from './types'

/** Group heading used for members whose direct boss was never recorded. */
export const NO_BOSS = ''

/** How many distinct colours the categorical palette offers. */
export const SLOT_COUNT = 8

/** Bosses beyond the palette share one neutral slot; colours are never cycled. */
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
 * Map each boss to a fixed colour slot.
 *
 * Slots follow the boss's name, not the order they happen to appear in, so one
 * boss wears the same colour on every trip card and adding or removing people
 * never repaints anyone else.
 */
export function bossSlots(members: Member[]): Map<string, number> {
  const names = [...new Set(members.map((m) => m.directBoss.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
  return new Map(names.map((name, index) => [name, index < SLOT_COUNT ? index : OTHER_SLOT]))
}
