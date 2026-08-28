import { useDroppable } from '@dnd-kit/core'
import type { AssignmentStatus, Member } from '../store/types'
import { NO_BOSS, OTHER_SLOT, groupByBoss } from '../store/groupByBoss'
import { teamCoverage } from '../store/teamCoverage'
import { AssignedMember } from './MemberChip'

const people = (count: number): string => `${count} ${count === 1 ? 'member' : 'members'}`

/**
 * One half of a trip card: everyone with a given status, split into a column
 * per direct boss. Confirmed and tentative are the same component, so the two
 * halves cannot drift apart.
 */
export function MemberPanel({
  status,
  title,
  members,
  allMembers,
  tripId,
  tripName,
  slots,
  selectedId,
  conflictFor,
  onSelect,
  onMove,
  onRemove,
}: {
  status: AssignmentStatus
  title: string
  members: Member[]
  /** The whole roster, so a team's size can be measured against it. */
  allMembers: Member[]
  tripId: string
  tripName: string
  slots: Map<string, number>
  selectedId: string | null
  conflictFor: (memberId: string) => string | undefined
  onSelect: (memberId: string) => void
  onMove: (memberId: string) => void
  onRemove: (memberId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `panel:${tripId}:${status}`,
    data: { type: 'trip', tripId, status },
  })

  const columns = groupByBoss(members)
  // Coverage only makes sense for people who are actually going.
  const showCoverage = status === 'confirmed'
  const onTripIds = members.map((m) => m.id)
  const moveLabel = status === 'confirmed' ? 'Move down to tentative' : 'Move up to confirmed'

  return (
    <section
      ref={setNodeRef}
      className={`member-panel panel-${status}${isOver ? ' drop-target' : ''}`}
      role="group"
      aria-label={`${title}, ${people(members.length)}`}
    >
      <h4 className="panel-title">
        <span>{title}</span>
        <span className="panel-count">{members.length}</span>
      </h4>

      {columns.length === 0 ? (
        <p className="chips-empty">
          {status === 'confirmed' ? 'Drag people here' : 'Nobody tentative'}
        </p>
      ) : (
        <div className="boss-columns">
          {columns.map((column) => {
            const named = column.boss !== NO_BOSS
            const heading = named ? column.boss : 'No boss recorded'
            const slot = named ? (slots.get(column.boss) ?? OTHER_SLOT) : OTHER_SLOT
            const cover = teamCoverage(allMembers, column.boss, onTripIds)
            const label = showCoverage
              ? `${heading}, ${cover.confirmed} of ${cover.teamSize} confirmed, ${cover.percent}%`
              : `${heading}, ${people(column.members.length)}`
            return (
              <section
                key={heading}
                className="boss-column"
                data-boss-slot={slot}
                role="group"
                aria-label={label}
              >
                <h5 className="boss-heading">
                  <span className="boss-name">{heading}</span>
                  {showCoverage ? (
                    <span className="boss-ratio">
                      <span className="boss-count">{`${cover.confirmed}/${cover.teamSize}`}</span>
                      <span className="boss-percent">{`${cover.percent}%`}</span>
                    </span>
                  ) : (
                    <span className="boss-count">{column.members.length}</span>
                  )}
                </h5>
                {showCoverage && (
                  <span
                    className="coverage-meter"
                    data-testid="coverage-meter"
                    data-percent={cover.percent}
                    aria-hidden="true"
                  >
                    <span className="coverage-fill" style={{ width: `${cover.percent}%` }} />
                  </span>
                )}
                <ul className="chips">
                  {column.members.map((member) => (
                    <AssignedMember
                      key={member.id}
                      member={member}
                      tripId={tripId}
                      tripName={tripName}
                      conflict={conflictFor(member.id)}
                      selected={selectedId === member.id}
                      moveLabel={moveLabel}
                      onSelect={() => onSelect(member.id)}
                      onMove={() => onMove(member.id)}
                      onRemove={() => onRemove(member.id)}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
