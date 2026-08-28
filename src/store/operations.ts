import type { Assignment, AssignmentStatus, Member, MemberDraft, TravelData, Trip } from './types'
import { tripOverlaps } from './derive'

export const SCHEMA_VERSION = 3

const newId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.floor(performance.now() * 1000)}-${Math.floor(Math.random() * 1e9)}`

export function emptyData(): TravelData {
  return { schemaVersion: SCHEMA_VERSION, members: [], trips: [], assignments: [] }
}

// --- members ---------------------------------------------------------------

export type NewMember = Pick<MemberDraft, 'domainName'> & Partial<MemberDraft>

export function addMember(data: TravelData, input: NewMember): TravelData {
  const domainName = input.domainName.trim()
  const member: Member = {
    id: newId(),
    domainName,
    fullName: input.fullName?.trim() || domainName,
    directBoss: input.directBoss?.trim() ?? '',
    location: input.location?.trim() ?? '',
    active: input.active ?? true,
  }
  return { ...data, members: [...data.members, member] }
}

export function updateMember(data: TravelData, id: string, patch: Partial<Omit<Member, 'id'>>): TravelData {
  return { ...data, members: data.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) }
}

/** Removing a member also drops their assignments, so no trip keeps a dangling reference. */
export function deleteMember(data: TravelData, id: string): TravelData {
  return {
    ...data,
    members: data.members.filter((m) => m.id !== id),
    assignments: data.assignments.filter((a) => a.memberId !== id),
  }
}

// --- trips -----------------------------------------------------------------

export type NewTrip = Pick<Trip, 'destination' | 'startDate' | 'durationDays'> &
  Partial<Omit<Trip, 'id' | 'destination' | 'startDate' | 'durationDays'>>

export function addTrip(data: TravelData, input: NewTrip): TravelData {
  const trip: Trip = {
    id: newId(),
    destination: input.destination.trim(),
    startDate: input.startDate,
    durationDays: Math.max(1, Math.round(input.durationDays) || 1),
    purpose: input.purpose?.trim() ?? '',
    status: input.status ?? 'planned',
    notes: input.notes?.trim() ?? '',
  }
  return { ...data, trips: [...data.trips, trip] }
}

export function updateTrip(data: TravelData, id: string, patch: Partial<Omit<Trip, 'id'>>): TravelData {
  return {
    ...data,
    trips: data.trips.map((t) =>
      t.id === id
        ? { ...t, ...patch, durationDays: Math.max(1, Math.round(patch.durationDays ?? t.durationDays) || 1) }
        : t,
    ),
  }
}

export function deleteTrip(data: TravelData, id: string): TravelData {
  return {
    ...data,
    trips: data.trips.filter((t) => t.id !== id),
    assignments: data.assignments.filter((a) => a.tripId !== id),
  }
}

// --- assignments -----------------------------------------------------------

const has = (data: TravelData, tripId: string, memberId: string): boolean =>
  data.assignments.some((a) => a.tripId === tripId && a.memberId === memberId)

export function assign(
  data: TravelData,
  tripId: string,
  memberId: string,
  status: AssignmentStatus = 'confirmed',
): TravelData {
  const known = data.trips.some((t) => t.id === tripId) && data.members.some((m) => m.id === memberId)
  if (!known) return data
  // Already on the trip: treat this as a change of status rather than a duplicate.
  if (has(data, tripId, memberId)) return setAssignmentStatus(data, tripId, memberId, status)
  const assignment: Assignment = { id: newId(), tripId, memberId, status }
  return { ...data, assignments: [...data.assignments, assignment] }
}

/** Move someone between the confirmed and tentative lists for one trip. */
export function setAssignmentStatus(
  data: TravelData,
  tripId: string,
  memberId: string,
  status: AssignmentStatus,
): TravelData {
  if (!has(data, tripId, memberId)) return data
  return {
    ...data,
    assignments: data.assignments.map((a) =>
      a.tripId === tripId && a.memberId === memberId ? { ...a, status } : a,
    ),
  }
}

/** Someone's status on a trip. Assignments written before statuses read as confirmed. */
export function assignmentStatus(data: TravelData, tripId: string, memberId: string): AssignmentStatus {
  const found = data.assignments.find((a) => a.tripId === tripId && a.memberId === memberId)
  return found?.status ?? 'confirmed'
}

export function unassign(data: TravelData, tripId: string, memberId: string): TravelData {
  return {
    ...data,
    assignments: data.assignments.filter((a) => !(a.tripId === tripId && a.memberId === memberId)),
  }
}

export function moveAssignment(data: TravelData, fromTripId: string, toTripId: string, memberId: string): TravelData {
  if (fromTripId === toTripId) return data
  return assign(unassign(data, fromTripId, memberId), toTripId, memberId)
}

// --- queries ---------------------------------------------------------------

export function membersOnTrip(data: TravelData, tripId: string): Member[] {
  const ids = new Set(data.assignments.filter((a) => a.tripId === tripId).map((a) => a.memberId))
  return data.members.filter((m) => ids.has(m.id))
}

/** Everyone on a trip with the given status. */
export function membersOnTripByStatus(data: TravelData, tripId: string, status: AssignmentStatus): Member[] {
  const ids = new Set(
    data.assignments
      .filter((a) => a.tripId === tripId && (a.status ?? 'confirmed') === status)
      .map((a) => a.memberId),
  )
  return data.members.filter((m) => ids.has(m.id))
}

export function tripsForMember(data: TravelData, memberId: string): Trip[] {
  const ids = new Set(data.assignments.filter((a) => a.memberId === memberId).map((a) => a.tripId))
  return data.trips.filter((t) => ids.has(t.id))
}

/** Other trips this member is already on that share a day with the given trip. */
export function conflictsFor(data: TravelData, tripId: string, memberId: string): Trip[] {
  const trip = data.trips.find((t) => t.id === tripId)
  if (!trip) return []
  return tripsForMember(data, memberId).filter((other) => tripOverlaps(trip, other))
}
