import type { Member } from './types'

export interface Coverage {
  /** How many of this boss's team are confirmed on the trip. */
  confirmed: number
  /** How many people the boss has to draw on. */
  teamSize: number
  /** confirmed / teamSize as a whole percentage; 0 when there is no team. */
  percent: number
}

/**
 * How much of one boss's team is confirmed on a trip.
 *
 * The team counts current members, plus anyone already on the trip who has since
 * been marked as having left - so the figure can never read above 100%.
 */
export function teamCoverage(members: Member[], boss: string, confirmedIds: string[]): Coverage {
  const onTrip = new Set(confirmedIds)
  const wanted = boss.trim()

  const team = members.filter((m) => m.directBoss.trim() === wanted && (m.active || onTrip.has(m.id)))
  const confirmed = team.filter((m) => onTrip.has(m.id)).length

  return {
    confirmed,
    teamSize: team.length,
    percent: team.length === 0 ? 0 : Math.round((confirmed / team.length) * 100),
  }
}
