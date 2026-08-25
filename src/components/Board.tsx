import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useStore } from '../store/context'
import { isPast } from '../store/derive'
import { conflictsFor, emptyData } from '../store/operations'
import type { Member, TravelData, Trip, TripStatus } from '../store/types'
import { RosterPanel } from './RosterPanel'
import { TripCard } from './TripCard'
import { MemberForm, type MemberDraft } from './MemberForm'
import { TripForm, type TripDraft } from './TripForm'

/** Today as a local yyyy-mm-dd, so "past" flips over at the user's midnight, not UTC's. */
function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

interface Clash {
  memberId: string
  tripId: string
  fromTripId?: string
  message: string
}

export function Board() {
  const store = useStore()
  const { data } = store
  const today = todayIso()

  const [memberQuery, setMemberQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [tripQuery, setTripQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TripStatus>('all')
  const [memberForm, setMemberForm] = useState<{ open: boolean; member?: Member }>({ open: false })
  const [tripForm, setTripForm] = useState<{ open: boolean; trip?: Trip }>({ open: false })
  const [clash, setClash] = useState<Clash | null>(null)
  const [dragged, setDragged] = useState<Member | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const teams = useMemo(
    () => Array.from(new Set(data.members.map((m) => m.team).filter(Boolean))).sort(),
    [data.members],
  )

  const visibleMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase()
    return data.members
      .filter((m) => (teamFilter === 'all' ? true : m.team === teamFilter))
      .filter((m) => !q || `${m.name} ${m.team} ${m.role}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
  }, [data.members, memberQuery, teamFilter])

  const { upcoming, pastTrips } = useMemo(() => {
    const q = tripQuery.trim().toLowerCase()
    const matches = data.trips
      .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
      .filter((t) => !q || `${t.destination} ${t.purpose} ${t.notes}`.toLowerCase().includes(q))
    return {
      upcoming: matches.filter((t) => !isPast(t, today)).sort((a, b) => a.startDate.localeCompare(b.startDate)),
      pastTrips: matches.filter((t) => isPast(t, today)).sort((a, b) => b.startDate.localeCompare(a.startDate)),
    }
  }, [data.trips, tripQuery, statusFilter, today])

  // --- assignment, with a non-blocking clash warning --------------------------

  function place(tripId: string, memberId: string, fromTripId?: string) {
    if (fromTripId === tripId) return
    // Trips they are already on that share a day - ignoring the one they are leaving.
    const clashes = conflictsFor(data, tripId, memberId).filter((t) => t.id !== fromTripId)

    if (fromTripId) store.moveAssignment(fromTripId, tripId, memberId)
    else store.assign(tripId, memberId)

    const member = data.members.find((m) => m.id === memberId)
    const trip = data.trips.find((t) => t.id === tripId)
    if (clashes.length && member && trip) {
      const names = clashes.map((c) => c.destination).join(', ')
      setClash({
        memberId,
        tripId,
        fromTripId,
        message: `${member.name} is already on ${names} during ${trip.destination}.`,
      })
    } else {
      setClash(null)
    }
  }

  function undoClash() {
    if (!clash) return
    if (clash.fromTripId) store.moveAssignment(clash.tripId, clash.fromTripId, clash.memberId)
    else store.unassign(clash.tripId, clash.memberId)
    setClash(null)
  }

  // --- drag and drop ----------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  function onDragStart(event: DragStartEvent) {
    const memberId = event.active.data.current?.memberId as string | undefined
    setDragged(data.members.find((m) => m.id === memberId) ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    setDragged(null)
    const active = event.active.data.current
    const over = event.over?.data.current
    if (!active || !over) return

    if (over.type === 'trip') {
      place(over.tripId as string, active.memberId as string, active.fromTripId as string | undefined)
    } else if (over.type === 'roster' && active.type === 'assigned') {
      store.unassign(active.fromTripId as string, active.memberId as string)
      setClash(null)
    }
  }

  // --- import / export --------------------------------------------------------

  function download(text: string, filename: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as TravelData
      if (!Array.isArray(parsed.members) || !Array.isArray(parsed.trips)) throw new Error('bad shape')
      store.replaceAll({ ...emptyData(), ...parsed, assignments: parsed.assignments ?? [] })
    } catch {
      window.alert('That file is not a travel tracker export.')
    }
  }

  function deleteMember(member: Member) {
    const count = data.assignments.filter((a) => a.memberId === member.id).length
    const suffix = count === 1 ? 'trip' : 'trips'
    const warning = count ? ` They are on ${count} ${suffix}, which will lose them.` : ''
    if (window.confirm(`Delete ${member.name}?${warning}`)) store.deleteMember(member.id)
  }

  function deleteTrip(trip: Trip) {
    if (window.confirm(`Delete the trip to ${trip.destination}?`)) store.deleteTrip(trip.id)
  }

  const tripSection = (label: string, trips: Trip[], emptyText: string) => (
    <section className="trip-section" aria-label={label}>
      <h2>{label}</h2>
      {trips.length === 0 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <div className="trip-grid">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              data={data}
              onAssign={(memberId) => place(trip.id, memberId)}
              onUnassign={(memberId) => store.unassign(trip.id, memberId)}
              onEdit={() => setTripForm({ open: true, trip })}
              onDelete={() => deleteTrip(trip)}
            />
          ))}
        </div>
      )}
    </section>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="app">
        <header className="app-head">
          <h1>Travel Tracker</h1>
          <div className="app-actions">
            <button onClick={() => download(JSON.stringify(data, null, 2), `travel-tracker-${today}.json`)}>
              Export
            </button>
            <button onClick={() => importRef.current?.click()}>Import</button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              aria-label="Import data file"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importJson(file)
                e.target.value = ''
              }}
            />
          </div>
        </header>

        {store.recovered !== undefined && (
          <div className="banner">
            <span>Saved data could not be read, so the app started empty. Your original data is untouched.</span>
            <button onClick={() => download(store.recovered!, 'travel-tracker-unreadable.json')}>Download it</button>
            <button onClick={store.dismissRecovered}>Dismiss</button>
          </div>
        )}

        {clash && (
          <div role="alert" className="banner banner-warn">
            <span>{clash.message}</span>
            <button onClick={undoClash}>Undo</button>
            <button onClick={() => setClash(null)}>Keep anyway</button>
          </div>
        )}

        {memberForm.open && (
          <MemberForm
            initial={memberForm.member}
            onCancel={() => setMemberForm({ open: false })}
            onSave={(draft: MemberDraft) => {
              if (memberForm.member) store.updateMember(memberForm.member.id, draft)
              else store.addMember(draft)
              setMemberForm({ open: false })
            }}
          />
        )}

        {tripForm.open && (
          <TripForm
            initial={tripForm.trip}
            today={today}
            onCancel={() => setTripForm({ open: false })}
            onSave={(draft: TripDraft) => {
              if (tripForm.trip) store.updateTrip(tripForm.trip.id, draft)
              else store.addTrip(draft)
              setTripForm({ open: false })
            }}
          />
        )}

        <div className="layout">
          <RosterPanel
            members={visibleMembers}
            query={memberQuery}
            onQueryChange={setMemberQuery}
            team={teamFilter}
            onTeamChange={setTeamFilter}
            teams={teams}
            onAdd={() => setMemberForm({ open: true })}
            onEdit={(member) => setMemberForm({ open: true, member })}
            onDelete={deleteMember}
          />

          <main className="board">
            <div className="board-head">
              <div className="board-filters">
                <label className="visually-hidden" htmlFor="trip-filter">
                  Filter trips
                </label>
                <input
                  id="trip-filter"
                  type="search"
                  placeholder="Filter trips by destination or purpose…"
                  value={tripQuery}
                  onChange={(e) => setTripQuery(e.target.value)}
                />
                <label className="visually-hidden" htmlFor="status-filter">
                  Filter by status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | TripStatus)}
                >
                  <option value="all">Any status</option>
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <button className="primary" onClick={() => setTripForm({ open: true })}>
                Add trip
              </button>
            </div>

            {tripSection('Upcoming trips', upcoming, 'No upcoming trips.')}
            {tripSection('Past trips', pastTrips, 'No past trips yet.')}
          </main>
        </div>
      </div>

      <DragOverlay>{dragged ? <div className="drag-ghost">{dragged.name}</div> : null}</DragOverlay>
    </DndContext>
  )
}
