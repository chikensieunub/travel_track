import type { Member, TravelData } from './types'
import { strays, unusedLeavers } from './tidyLeavers'

const SHOW = 6

const listOf = (people: Member[]): string => {
  const shown = people.slice(0, SHOW).map((m) => `  ${m.fullName}`)
  const rest = people.length - shown.length
  return [...shown, rest > 0 ? `  …and ${rest} more` : ''].filter(Boolean).join('\n')
}

/** What the tidy-up is about to do, named person by person before it happens. */
export function tidySummary(data: TravelData): string {
  const shadows = strays(data)
  const shadowIds = new Set(shadows.map((m) => m.id))
  const empties = unusedLeavers(data).filter((m) => !shadowIds.has(m.id))

  const parts: string[] = ['Tidy up these records? No trip loses anyone.']

  if (shadows.length > 0) {
    parts.push(
      `${shadows.length} duplicate someone still here — their trips move across, then the copy goes:\n${listOf(shadows)}`,
    )
  }
  if (empties.length > 0) {
    parts.push(`${empties.length} are on no trips at all, so they are simply removed:\n${listOf(empties)}`)
  }

  return parts.join('\n\n')
}
