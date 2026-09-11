import type { Member, TravelData } from './types'
import { assignmentStatus, membersOnTrip } from './operations'
import { isBoss } from './boss'

export interface ExportRow {
  destination: string
  fullName: string
  domainName: string
  directBoss: string
  location: string
  onTrip: string
  [key: string]: string | number
}

export const EXPORT_COLUMNS: { key: keyof ExportRow & string; label: string; width: number }[] = [
  { key: 'destination', label: 'Destination', width: 22 },
  { key: 'fullName', label: 'Member', width: 26 },
  { key: 'domainName', label: 'Domain name', width: 22 },
  { key: 'directBoss', label: 'Direct boss', width: 18 },
  { key: 'location', label: 'Location', width: 16 },
  { key: 'onTrip', label: 'On trip', width: 12 },
]

/** How the sheet describes someone's place on a trip, matching the card's panels. */
const ORDER = ['Boss', 'Confirmed', 'Tentative', 'Left the company']

function standing(data: TravelData, tripId: string, member: Member): string {
  if (isBoss(member)) return 'Boss'
  if (!member.active) return 'Left the company'
  return assignmentStatus(data, tripId, member.id) === 'tentative' ? 'Tentative' : 'Confirmed'
}

/**
 * Flatten the tracker to one row per person per trip.
 *
 * Built from everyone assigned to the trip rather than from each panel in turn,
 * so nobody can fall between the panels' rules and be left out of the report.
 * A trip nobody is on still produces a row with the people columns blank, so an
 * empty trip cannot silently vanish either.
 */
export function exportRows(data: TravelData): ExportRow[] {
  const trips = [...data.trips].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.destination.localeCompare(b.destination),
  )

  return trips.flatMap((trip) => {
    const rows = membersOnTrip(data, trip.id)
      .map((member) => ({
        destination: trip.destination,
        fullName: member.fullName,
        domainName: member.domainName,
        directBoss: member.directBoss,
        location: member.location,
        onTrip: standing(data, trip.id, member),
      }))
      .sort(
        (a, b) =>
          ORDER.indexOf(a.onTrip) - ORDER.indexOf(b.onTrip) ||
          a.directBoss.localeCompare(b.directBoss) ||
          a.fullName.localeCompare(b.fullName),
      )

    if (rows.length > 0) return rows
    return [{ destination: trip.destination, fullName: '', domainName: '', directBoss: '', location: '', onTrip: '' }]
  })
}
