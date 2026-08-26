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
      <span ref={setNodeRef} className="grip" {...listeners} {...attributes} aria-label={`Drag ${member.fullName}`}>
        ⠿
      </span>
      <span className="roster-member-text">
        <strong>{member.fullName}</strong>
        <small>{[member.location, member.directBoss && `→ ${member.directBoss}`].filter(Boolean).join(' · ') || member.domainName}</small>
      </span>
      <button className="icon" onClick={onEdit} aria-label={`Edit ${member.fullName}`}>✎</button>
      <button className="icon" onClick={onDelete} aria-label={`Delete ${member.fullName}`}>×</button>
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
      aria-label={`${member.fullName} on ${tripName}${conflict ? `, clashes with ${conflict}` : ''}`}
    >
      <span ref={setNodeRef} {...listeners} {...attributes} className="chip-grab">
        {conflict && (
          <span className="conflict-dot" title={`Also on ${conflict} during this trip`} aria-hidden="true">
            !
          </span>
        )}
        {member.fullName}
      </span>
      <button className="chip-remove" onClick={onRemove} aria-label={`Remove ${member.fullName} from ${tripName}`}>
        ×
      </button>
    </li>
  )
}
