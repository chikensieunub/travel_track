export type TripStatus = 'planned' | 'confirmed' | 'done'

export interface Member {
  id: string
  /** Network account, e.g. ACME\acruz. Unique key when importing. */
  domainName: string
  fullName: string
  /** Who they report to, as written in the source system. Free text, not a link. */
  directBoss: string
  location: string
  active: boolean
}

/** A member without an id: what an import row or a form produces. */
export type MemberDraft = Omit<Member, 'id'>

export interface Trip {
  id: string
  destination: string
  startDate: string // ISO yyyy-mm-dd, inclusive first day
  durationDays: number // >= 1
  purpose: string
  status: TripStatus
  notes: string
}

export interface Assignment {
  id: string
  tripId: string
  memberId: string
}

export interface TravelData {
  schemaVersion: number
  members: Member[]
  trips: Trip[]
  assignments: Assignment[]
}

/** Shape of members before domain name / boss / location replaced team and role. */
export interface MemberV1 {
  id: string
  name: string
  team: string
  role: string
  active: boolean
}
