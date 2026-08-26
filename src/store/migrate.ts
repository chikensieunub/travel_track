import type { Member, MemberV1, TravelData } from './types'
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

/** Bring stored data up to the current schema. Trips and assignments never change. */
export function migrate(stored: unknown): TravelData {
  const data = stored as Partial<TravelData> & { members?: unknown[] }
  const version = data.schemaVersion ?? 1

  if (version >= SCHEMA_VERSION) {
    return {
      schemaVersion: SCHEMA_VERSION,
      members: (data.members ?? []) as Member[],
      trips: data.trips ?? [],
      assignments: data.assignments ?? [],
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    members: ((data.members ?? []) as MemberV1[]).map(memberFromV1),
    trips: data.trips ?? [],
    assignments: data.assignments ?? [],
  }
}
