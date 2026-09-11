import { useState } from 'react'
import type { AssignmentStatus, Member, TravelData, Trip } from '../store/types'
import { formatRange } from '../store/derive'
import {
  assignmentStatus,
  conflictsFor,
  leaversOnTrip,
  membersOnTrip,
  membersOnTripByStatus,
} from '../store/operations'
import { cardSlots, cardSpan, groupByBoss } from '../store/groupByBoss'
import { MemberPanel } from './MemberPanel'
import { BossPanel } from './BossPanel'
import { isBoss } from '../store/boss'

const STATUS_LABEL: Record<Trip['status'], string> = {
  planned: 'Planned',
  confirmed: 'Confirmed',
  done: 'Done',
}

const people = (count: number): string => `${count} ${count === 1 ? 'member' : 'members'}`

export function TripCard({
  trip,
  data,
  onAssign,
  onUnassign,
  onSetStatus,
  onEdit,
  onDelete,
}: {
  trip: Trip
  data: TravelData
  onAssign: (memberId: string) => void
  onUnassign: (memberId: string) => void
  onSetStatus: (memberId: string, status: AssignmentStatus) => void
  onEdit: () => void
  onDelete: () => void
}) {
  // Selection is per card, so the same person on two trips is armed on only one.
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const assigned = membersOnTrip(data, trip.id)
  const assignedIds = new Set(assigned.map((m) => m.id))
  const available: Member[] = data.members.filter((m) => m.active && !assignedIds.has(m.id))

  // The boss is lifted out of the team columns, but only while he is still here.
  const boss = membersOnTrip(data, trip.id).find((m) => m.active && isBoss(m))
  const notBoss = (list: Member[]) => list.filter((m) => m.id !== boss?.id)

  const confirmed = notBoss(membersOnTripByStatus(data, trip.id, 'confirmed'))
  const tentative = notBoss(membersOnTripByStatus(data, trip.id, 'tentative'))
  const leavers = leaversOnTrip(data, trip.id)

  const confirmedGroups = groupByBoss(confirmed)
  const tentativeGroups = groupByBoss(tentative)
  const leaverGroups = groupByBoss(leavers)

  // Resolved once for the whole card, so a boss looks the same in both panels
  // and no two teams on this card share a colour.
  const slots = cardSlots(
    data.members,
    [...confirmedGroups, ...tentativeGroups, ...leaverGroups].map((g) => g.boss),
  )

  /** Other trips each assignee is on that share a day with this one. */
  const conflictFor = (memberId: string): string | undefined =>
    conflictsFor(data, trip.id, memberId)
      .map((t) => t.destination)
      .join(', ') || undefined

  const toggleSelect = (memberId: string) => setSelectedId((current) => (current === memberId ? null : memberId))

  function move(memberId: string) {
    const now = assignmentStatus(data, trip.id, memberId)
    onSetStatus(memberId, now === 'confirmed' ? 'tentative' : 'confirmed')
    setSelectedId(null)
  }

  function remove(memberId: string) {
    if (selectedId === memberId) setSelectedId(null)
    onUnassign(memberId)
  }

  // Width follows how much there is to show, so busy trips get shorter, not narrower.
  const groups = confirmedGroups.length + tentativeGroups.length + leaverGroups.length
  const span = cardSpan(assigned.length, groups)

  return (
    <article
      className={`trip-card status-${trip.status} span-${span}`}
      data-boss-groups={groups}
      aria-label={trip.destination}
    >
      <header className="trip-head">
        <div>
          <h3>{trip.destination}</h3>
          <p className="trip-dates">{formatRange(trip)}</p>
        </div>
        <div className="trip-head-actions">
          <span className={`badge badge-${trip.status}`}>{STATUS_LABEL[trip.status]}</span>
          <button className="icon" onClick={onEdit} aria-label={`Edit ${trip.destination}`}>✎</button>
          <button className="icon" onClick={onDelete} aria-label={`Delete ${trip.destination}`}>×</button>
        </div>
      </header>

      {assigned.length > 0 && <p className="trip-total">{people(assigned.length)}</p>}

      {trip.purpose && <p className="trip-purpose">{trip.purpose}</p>}
      {trip.notes && <p className="trip-notes">{trip.notes}</p>}

      {boss && (
        <BossPanel
          boss={boss}
          status={assignmentStatus(data, trip.id, boss.id)}
          tripId={trip.id}
          tripName={trip.destination}
          selected={selectedId === boss.id}
          conflict={conflictFor(boss.id)}
          onSelect={() => toggleSelect(boss.id)}
          onMove={() => move(boss.id)}
          onRemove={() => remove(boss.id)}
        />
      )}

      <MemberPanel
        status="confirmed"
        title="Confirmed"
        members={confirmed}
        allMembers={data.members}
        tripId={trip.id}
        tripName={trip.destination}
        slots={slots}
        selectedId={selectedId}
        conflictFor={conflictFor}
        onSelect={toggleSelect}
        onMove={move}
        onRemove={remove}
      />

      <MemberPanel
        status="tentative"
        title="Tentative"
        members={tentative}
        allMembers={data.members}
        tripId={trip.id}
        tripName={trip.destination}
        slots={slots}
        selectedId={selectedId}
        conflictFor={conflictFor}
        onSelect={toggleSelect}
        onMove={move}
        onRemove={remove}
      />

      {leavers.length > 0 && (
        <MemberPanel
          status="left"
          title="Left the company"
          members={leavers}
          allMembers={data.members}
          tripId={trip.id}
          tripName={trip.destination}
          slots={slots}
          selectedId={selectedId}
          conflictFor={conflictFor}
          onSelect={toggleSelect}
          onMove={move}
          onRemove={remove}
        />
      )}

      <label className="visually-hidden" htmlFor={`add-${trip.id}`}>
        Add member to {trip.destination}
      </label>
      <select
        id={`add-${trip.id}`}
        className="add-member"
        value=""
        disabled={available.length === 0}
        onChange={(e) => {
          if (e.target.value) onAssign(e.target.value)
        }}
      >
        <option value="">
          {available.length === 0 ? 'Everyone is already on this trip' : '+ Add member…'}
        </option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName}
          </option>
        ))}
      </select>
    </article>
  )
}
