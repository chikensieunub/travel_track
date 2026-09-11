import type { Member, TravelData } from './types'
import { nameKey } from './names'

/**
 * People marked as having left who are on no trip at all.
 *
 * These are leftovers: a name that failed to match on import became a second
 * record, and once the real person is matched instead, the stray holds nothing.
 * A leaver who *is* on a trip is real history and is never included here.
 */
export function unusedLeavers(data: TravelData): Member[] {
  const onTrips = new Set(data.assignments.map((a) => a.memberId))
  return data.members.filter((m) => !m.active && !onTrips.has(m.id))
}

/** Remove those records. Trips and assignments are untouched, so nothing is lost. */
export function removeUnusedLeavers(data: TravelData): { data: TravelData; removed: number } {
  const doomed = new Set(unusedLeavers(data).map((m) => m.id))
  if (doomed.size === 0) return { data, removed: 0 }
  return {
    data: { ...data, members: data.members.filter((m) => !doomed.has(m.id)) },
    removed: doomed.size,
  }
}

/**
 * Records marked as having left that shadow someone still here under the same
 * name.
 *
 * These came from a name that failed to match on import: the person was already
 * in the roster, but a difference nobody can see - an encoding, an invisible
 * character, where a tone mark sits - meant a second record was created instead.
 * The real person still being on the roster is what marks it as a stray.
 */
export function strays(data: TravelData): Member[] {
  const here = new Set(data.members.filter((m) => m.active).map((m) => nameKey(m.fullName)))
  return data.members.filter((m) => !m.active && here.has(nameKey(m.fullName)))
}

/**
 * Fold each stray into the person it shadows: their trips move across, then the
 * stray record goes. No trip and no assignment is lost.
 */
export function absorbStrays(data: TravelData): { data: TravelData; absorbed: number } {
  const doomed = strays(data)
  if (doomed.length === 0) return { data, absorbed: 0 }

  const realByName = new Map(data.members.filter((m) => m.active).map((m) => [nameKey(m.fullName), m]))
  const replacement = new Map(doomed.map((s) => [s.id, realByName.get(nameKey(s.fullName))!.id]))

  const seen = new Set<string>()
  const assignments = data.assignments
    .map((a) => ({ ...a, memberId: replacement.get(a.memberId) ?? a.memberId }))
    .filter((a) => {
      const pair = `${a.tripId}|${a.memberId}`
      if (seen.has(pair)) return false
      seen.add(pair)
      return true
    })

  const gone = new Set(doomed.map((m) => m.id))
  return {
    data: { ...data, members: data.members.filter((m) => !gone.has(m.id)), assignments },
    absorbed: doomed.length,
  }
}

export { tidySummary } from './tidySummary'
