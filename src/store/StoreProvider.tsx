import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { TravelData } from './types'
import { LocalStorageStore, type TravelStore } from './LocalStorageStore'
import { StoreCtx, type StoreValue } from './context'
import * as ops from './operations'
import { mergeMembers } from './mergeMembers'

export function StoreProvider({ children, store }: { children: ReactNode; store?: TravelStore }) {
  // Lazy initialisers so the backend is constructed and read exactly once.
  const [backend] = useState<TravelStore>(() => store ?? new LocalStorageStore())
  const [initial] = useState(() => backend.load())
  const [data, setData] = useState<TravelData>(initial.data)
  const [recovered, setRecovered] = useState<string | undefined>(initial.recovered)

  /** Every mutation goes through here, so persistence can never be forgotten at a call site. */
  const apply = useCallback(
    (change: (current: TravelData) => TravelData) => {
      setData((current) => {
        const next = change(current)
        backend.save(next)
        return next
      })
    },
    [backend],
  )

  const value = useMemo<StoreValue>(
    () => ({
      data,
      recovered,
      dismissRecovered: () => setRecovered(undefined),
      addMember: (input) => apply((d) => ops.addMember(d, input)),
      updateMember: (id, patch) => apply((d) => ops.updateMember(d, id, patch)),
      deleteMember: (id) => apply((d) => ops.deleteMember(d, id)),
      addTrip: (input) => apply((d) => ops.addTrip(d, input)),
      updateTrip: (id, patch) => apply((d) => ops.updateTrip(d, id, patch)),
      deleteTrip: (id) => apply((d) => ops.deleteTrip(d, id)),
      assign: (tripId, memberId) => apply((d) => ops.assign(d, tripId, memberId)),
      unassign: (tripId, memberId) => apply((d) => ops.unassign(d, tripId, memberId)),
      moveAssignment: (from, to, memberId) => apply((d) => ops.moveAssignment(d, from, to, memberId)),
      importMembers: (drafts) => apply((d) => mergeMembers(d, drafts).data),
      replaceAll: (next) => apply(() => next),
    }),
    [data, recovered, apply],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
