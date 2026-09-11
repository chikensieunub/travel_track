import type { Member } from './types'
import { nameKey } from './names'

/**
 * Who gets the Boss panel on a trip card.
 *
 * Identified by name for now, which is deliberate and temporary: two people can
 * share a name, and the real fix is a flag on the member. Change this one value
 * to point the panel at someone else.
 */
export const BOSS_NAME = 'Nguyễn Khánh Trung'

export function isBoss(member: Member): boolean {
  return nameKey(member.fullName) === nameKey(BOSS_NAME)
}
