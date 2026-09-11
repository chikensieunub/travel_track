import type { Member } from './types'

/**
 * Who gets the Boss panel on a trip card.
 *
 * Identified by name for now, which is deliberate and temporary: two people can
 * share a name, and the real fix is a flag on the member. Change this one value
 * to point the panel at someone else.
 */
export const BOSS_NAME = 'Nguyễn Khánh Trung'

/** Matched like every other name here: case and spacing loose, accents significant. */
const nameKey = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase()

export function isBoss(member: Member): boolean {
  return nameKey(member.fullName) === nameKey(BOSS_NAME)
}
