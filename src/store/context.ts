import { createContext, useContext } from 'react'
import type { AssignmentStatus, MemberDraft, TravelData } from './types'
import type { TripImport } from './importTrips'
import type * as ops from './operations'

export interface StoreValue {
  data: TravelData
  /** Raw text of stored data that could not be read, if any. */
  recovered?: string
  /** False when the browser refuses storage and changes will vanish on close. */
  persistent: boolean
  dismissRecovered(): void
  addMember(input: ops.NewMember): void
  updateMember(id: string, patch: Parameters<typeof ops.updateMember>[2]): void
  deleteMember(id: string): void
  addTrip(input: ops.NewTrip): void
  updateTrip(id: string, patch: Parameters<typeof ops.updateTrip>[2]): void
  deleteTrip(id: string): void
  assign(tripId: string, memberId: string): void
  unassign(tripId: string, memberId: string): void
  moveAssignment(fromTripId: string, toTripId: string, memberId: string): void
  /** Move someone between the confirmed and tentative panels of one trip. */
  setAssignmentStatus(tripId: string, memberId: string, status: AssignmentStatus): void
  /** Fold imported rows into the roster, keyed on domain name. */
  importMembers(drafts: MemberDraft[]): void
  /** Add or refresh trips from a spreadsheet, matching people by full name. */
  importTrips(trips: TripImport[]): void
  /** Fold shadow records into the person they duplicate, then drop empty ones. */
  tidyLeavers(): void
  replaceAll(data: TravelData): void
}

export const StoreCtx = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const value = useContext(StoreCtx)
  if (!value) throw new Error('useStore must be used inside a StoreProvider')
  return value
}
