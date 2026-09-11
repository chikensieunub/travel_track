import { useDroppable } from '@dnd-kit/core'
import type { AssignmentStatus, Member } from '../store/types'
import { AssignedMember } from './MemberChip'

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  confirmed: 'Confirmed',
  tentative: 'Tentative',
}

/**
 * The boss, on his own above the team columns.
 *
 * No team column here: grouping one person under his own manager would be noise,
 * so his confirmed-or-tentative state is shown as a tag instead.
 */
export function BossPanel({
  boss,
  status,
  tripId,
  tripName,
  selected,
  conflict,
  onSelect,
  onMove,
  onRemove,
}: {
  boss: Member
  status: AssignmentStatus
  tripId: string
  tripName: string
  selected: boolean
  conflict?: string
  onSelect: () => void
  onMove: () => void
  onRemove: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `panel:${tripId}:boss`,
    data: { type: 'trip', tripId, status: 'confirmed' },
  })

  return (
    <section
      ref={setNodeRef}
      className={`member-panel panel-boss${isOver ? ' drop-target' : ''}`}
      role="group"
      aria-label={`Boss, ${STATUS_LABEL[status]}`}
    >
      <h4 className="panel-title">
        <span>Boss</span>
        <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
      </h4>
      <ul className="chips">
        <AssignedMember
          member={boss}
          tripId={tripId}
          tripName={tripName}
          conflict={conflict}
          selected={selected}
          moveLabel={status === 'confirmed' ? 'Move down to tentative' : 'Move up to confirmed'}
          onSelect={onSelect}
          onMove={onMove}
          onRemove={onRemove}
        />
      </ul>
    </section>
  )
}
