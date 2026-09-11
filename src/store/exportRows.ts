import type { AssignmentStatus, TravelData, Trip, TripStatus } from './types'
import { endDate } from './derive'
import { membersOnTripByStatus } from './operations'

export interface ExportRow {
  destination: string
  startDate: string
  endDate: string
  durationDays: number
  tripStatus: string
  purpose: string
  fullName: string
  domainName: string
  directBoss: string
  location: string
  onTrip: string
  [key: string]: string | number
}

export const EXPORT_COLUMNS: { key: keyof ExportRow & string; label: string; width: number }[] = [
  { key: 'destination', label: 'Destination', width: 20 },
  { key: 'startDate', label: 'Start date', width: 12 },
  { key: 'endDate', label: 'End date', width: 12 },
  { key: 'durationDays', label: 'Days', width: 6 },
  { key: 'tripStatus', label: 'Trip status', width: 12 },
  { key: 'purpose', label: 'Purpose', width: 24 },
  { key: 'fullName', label: 'Member', width: 24 },
  { key: 'domainName', label: 'Domain name', width: 22 },
  { key: 'directBoss', label: 'Direct boss', width: 18 },
  { key: 'location', label: 'Location', width: 16 },
  { key: 'onTrip', label: 'On trip', width: 12 },
]

const TRIP_STATUS: Record<TripStatus, string> = { planned: 'Planned', confirmed: 'Confirmed', done: 'Done' }
const ON_TRIP: Record<AssignmentStatus, string> = { confirmed: 'Confirmed', tentative: 'Tentative' }

const tripPart = (trip: Trip) => ({
  destination: trip.destination,
  startDate: trip.startDate,
  endDate: endDate(trip),
  durationDays: trip.durationDays,
  tripStatus: TRIP_STATUS[trip.status],
  purpose: trip.purpose,
})

/**
 * Flatten the tracker to one row per person per trip.
 *
 * A trip nobody is on still produces a row with the people columns blank, so an
 * empty trip cannot silently vanish from the export.
 */
export function exportRows(data: TravelData): ExportRow[] {
  const trips = [...data.trips].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.destination.localeCompare(b.destination),
  )

  return trips.flatMap((trip) => {
    const rowsFor = (status: AssignmentStatus): ExportRow[] =>
      membersOnTripByStatus(data, trip.id, status)
        .slice()
        .sort((a, b) => a.directBoss.localeCompare(b.directBoss) || a.fullName.localeCompare(b.fullName))
        .map((member) => ({
          ...tripPart(trip),
          fullName: member.fullName,
          domainName: member.domainName,
          directBoss: member.directBoss,
          location: member.location,
          onTrip: ON_TRIP[status],
        }))

    // Confirmed first, then tentative - the same order the card reads in.
    const rows = [...rowsFor('confirmed'), ...rowsFor('tentative')]
    if (rows.length > 0) return rows

    return [{ ...tripPart(trip), fullName: '', domainName: '', directBoss: '', location: '', onTrip: '' }]
  })
}
