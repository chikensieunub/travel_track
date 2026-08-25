import { useDraggable } from '@dnd-kit/core'
import type { Member } from '../store/types'

/** A person in the roster, draggable onto a trip card. */
export function RosterMember({ member, onEdit, onDelete }: { member: Member; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member:${member.id}`,
    data: { type: 'member', memberId: member.id },
  })

  return (
    <li className={`roster-member${member.active ? '' : ' inactive'}${isDragging ? ' dragging' : ''}`}>
      <span ref={setNodeRef} className="grip" {...listeners} {...attributes} aria-label={`Drag ${member.name}`}>
        ⠿
      </span>
      <span className="roster-member-text">
        <strong>{member.name}</strong>
        <small>{[member.team, member.role].filter(Boolean).join(' · ') || 'No team set'}</small>
      </span>
      <button className="icon" onClick={onEdit} aria-label={`Edit ${member.name}`}>✎</button>
      <button className="icon" onClick={onDelete} aria-label={`Delete ${member.name}`}>×</button>
    </li>
  )
}

/** A person already on a trip: draggable to another trip, removable in place. */
export function AssignedMember({
  member,
  tripId,
  tripName,
  conflict,
  onRemove,
}: {
  member: Member
  tripId: string
  tripName: string
  conflict?: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assigned:${tripId}:${member.id}`,
    data: { type: 'assigned', memberId: member.id, fromTripId: tripId },
  })

  return (
    <li
      className={`chip${conflict ? ' chip-conflict' : ''}${isDragging ? ' dragging' : ''}`}
      aria-label={`${member.name} on ${tripName}${conflict ? `, clashes with ${conflict}` : ''}`}
    >
      <span ref={setNodeRef} {...listeners} {...attributes} className="chip-grab">
        {conflict && (
          <span className="conflict-dot" title={`Also on ${conflict} during this trip`} aria-hidden="true">
            !
          </span>
        )}
        {member.name}
      </span>
      <button className="chip-remove" onClick={onRemove} aria-label={`Remove ${member.name} from ${tripName}`}>
        ×
      </button>
    </li>
  )
}
