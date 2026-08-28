import type { Assignment, Member, MemberV1, TravelData } from './types'
import { SCHEMA_VERSION } from './operations'

/**
 * v1 members were {name, team, role}. Domain name is the key now, and v1 never
 * recorded one, so the old name seeds it - unique enough to work, and obvious
 * enough that a real import will correct it.
 */
function memberFromV1(old: MemberV1): Member {
  return {
    id: old.id,
    domainName: old.name,
    fullName: old.name,
    directBoss: '',
    location: old.team ?? '',
    active: old.active ?? true,
  }
}

/** Anyone already on a trip was planned in, so they start out confirmed. */
function assignmentToV3(old: Assignment): Assignment {
  return { ...old, status: old.status ?? 'confirmed' }
}

/**
 * Bring stored data up to the current schema, one step at a time.
 *
 * Each step is applied only when the data predates it, so upgrading the schema
 * can never re-run an earlier step over already-converted data.
 */
export function migrate(stored: unknown): TravelData {
  const data = stored as Partial<TravelData> & { members?: unknown[] }
  const version = data.schemaVersion ?? 1

  const members =
    version < 2
      ? ((data.members ?? []) as MemberV1[]).map(memberFromV1)
      : ((data.members ?? []) as Member[])

  const assignments = (data.assignments ?? []).map(assignmentToV3)

  return {
    schemaVersion: SCHEMA_VERSION,
    members,
    trips: data.trips ?? [],
    assignments,
  }
}
