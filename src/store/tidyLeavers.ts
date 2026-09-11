import type { Member, TravelData } from './types'

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
