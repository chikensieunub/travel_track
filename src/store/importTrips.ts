import type { Member, TravelData } from './types'
import { addMember, addTrip, assign, updateTrip } from './operations'

export interface TripImport {
  title: string
  startDate: string
  durationDays: number
  names: string[]
}

export interface MatchResult {
  matched: Member[]
  unmatched: string[]
}

export interface ApplyResult {
  data: TravelData
  tripsAdded: number
  tripsUpdated: number
  membersAdded: number
}

/**
 * People are matched on their full name, ignoring case and stray spacing.
 * Diacritics are kept significant: in Vietnamese names they distinguish
 * different people, so stripping them would merge two colleagues into one.
 */
const nameKey = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase()

const tripKey = (destination: string): string => destination.trim().toLowerCase()

export function matchNames(data: TravelData, names: string[]): MatchResult {
  const byName = new Map(data.members.map((m) => [nameKey(m.fullName), m]))
  const matched: Member[] = []
  const unmatched: string[] = []

  for (const name of names) {
    const found = byName.get(nameKey(name))
    if (found) matched.push(found)
    else unmatched.push(name.trim().replace(/\s+/g, ' '))
  }

  return { matched, unmatched }
}

/**
 * Fold imported trips into the tracker.
 *
 * A trip already present under the same name keeps its dates - those were set
 * here, not in the file - but has its people replaced by what the file says.
 * Anyone the roster does not know is added as having left the company, which is
 * what an unrecognised name on a past trip means.
 */
export function applyTripImport(data: TravelData, trips: TripImport[]): ApplyResult {
  let next = data
  let tripsAdded = 0
  let tripsUpdated = 0
  let membersAdded = 0

  for (const incoming of trips) {
    const { unmatched } = matchNames(next, incoming.names)
    for (const name of unmatched) {
      // Re-checked each time, so the same leaver on two trips is added once.
      if (matchNames(next, [name]).matched.length > 0) continue
      next = addMember(next, { domainName: name, fullName: name, active: false })
      membersAdded += 1
    }

    const existing = next.trips.find((t) => tripKey(t.destination) === tripKey(incoming.title))
    let tripId: string

    if (existing) {
      tripId = existing.id
      // Replace the people, keeping whatever dates were set here.
      next = { ...next, assignments: next.assignments.filter((a) => a.tripId !== tripId) }
      next = updateTrip(next, tripId, { destination: incoming.title })
      tripsUpdated += 1
    } else {
      next = addTrip(next, {
        destination: incoming.title,
        startDate: incoming.startDate,
        durationDays: incoming.durationDays,
      })
      tripId = next.trips[next.trips.length - 1].id
      tripsAdded += 1
    }

    for (const member of matchNames(next, incoming.names).matched) {
      next = assign(next, tripId, member.id)
    }
  }

  return { data: next, tripsAdded, tripsUpdated, membersAdded }
}
