export type TripStatus = 'planned' | 'confirmed' | 'done'

export interface Member {
  id: string
  name: string
  team: string
  role: string
  active: boolean
}

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
