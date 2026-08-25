import { createContext, useContext } from 'react'
import type { TravelData } from './types'
import type * as ops from './operations'

export interface StoreValue {
  data: TravelData
  /** Raw text of stored data that could not be read, if any. */
  recovered?: string
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
  replaceAll(data: TravelData): void
}

export const StoreCtx = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const value = useContext(StoreCtx)
  if (!value) throw new Error('useStore must be used inside a StoreProvider')
  return value
}
