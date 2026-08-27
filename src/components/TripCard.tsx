import { useDroppable } from '@dnd-kit/core'
import type { Member, TravelData, Trip } from '../store/types'
import { formatRange } from '../store/derive'
import { conflictsFor, membersOnTrip } from '../store/operations'
import { NO_BOSS, OTHER_SLOT, bossSlots, groupByBoss } from '../store/groupByBoss'
import { AssignedMember } from './MemberChip'

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
  onEdit,
  onDelete,
}: {
  trip: Trip
  data: TravelData
  onAssign: (memberId: string) => void
  onUnassign: (memberId: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `trip:${trip.id}`, data: { type: 'trip', tripId: trip.id } })

  const assigned = membersOnTrip(data, trip.id)
  const assignedIds = new Set(assigned.map((m) => m.id))
  const available: Member[] = data.members.filter((m) => m.active && !assignedIds.has(m.id))

  const columns = groupByBoss(assigned)
  // Slots come from the whole roster, so a boss keeps one colour across every card.
  const slots = bossSlots(data.members)

  /** Other trips each assignee is on that share a day with this one. */
  const clashFor = (memberId: string): string | undefined =>
    conflictsFor(data, trip.id, memberId)
      .map((t) => t.destination)
      .join(', ') || undefined

  // A card claims one board column per boss group, capped so it never hogs the row.
  const span = Math.min(Math.max(columns.length, 1), 3)

  return (
    <article
      ref={setNodeRef}
      className={`trip-card status-${trip.status} span-${span}${isOver ? ' drop-target' : ''}`}
      data-boss-groups={columns.length}
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

      {columns.length === 0 ? (
        <p className="chips-empty">Drag people here</p>
      ) : (
        <div className="boss-columns">
          {columns.map((column) => {
            const named = column.boss !== NO_BOSS
            const heading = named ? column.boss : 'No boss recorded'
            const slot = named ? (slots.get(column.boss) ?? OTHER_SLOT) : OTHER_SLOT
            return (
              <section
                key={heading}
                className="boss-column"
                data-boss-slot={slot}
                role="group"
                aria-label={`${heading}, ${people(column.members.length)}`}
              >
                <h4 className="boss-heading">
                  <span className="boss-name">{heading}</span>
                  <span className="boss-count">{column.members.length}</span>
                </h4>
                <ul className="chips">
                  {column.members.map((member) => (
                    <AssignedMember
                      key={member.id}
                      member={member}
                      tripId={trip.id}
                      tripName={trip.destination}
                      conflict={clashFor(member.id)}
                      onRemove={() => onUnassign(member.id)}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
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
