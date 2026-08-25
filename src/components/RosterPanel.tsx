import { useDroppable } from '@dnd-kit/core'
import type { Member } from '../store/types'
import { RosterMember } from './MemberChip'

export function RosterPanel({
  members,
  query,
  onQueryChange,
  team,
  onTeamChange,
  teams,
  onAdd,
  onEdit,
  onDelete,
}: {
  members: Member[]
  query: string
  onQueryChange: (value: string) => void
  team: string
  onTeamChange: (value: string) => void
  teams: string[]
  onAdd: () => void
  onEdit: (member: Member) => void
  onDelete: (member: Member) => void
}) {
  // Dropping a person back here takes them off the trip they came from.
  const { setNodeRef, isOver } = useDroppable({ id: 'roster', data: { type: 'roster' } })

  return (
    <section className="roster" aria-label="Members" ref={setNodeRef}>
      <header className="panel-head">
        <h2>Members</h2>
        <button className="primary small" onClick={onAdd}>Add member</button>
      </header>

      <div className="roster-filters">
        <label className="visually-hidden" htmlFor="member-search">Search members</label>
        <input
          id="member-search"
          type="search"
          placeholder="Search members…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <label className="visually-hidden" htmlFor="team-filter">Filter by team</label>
        <select id="team-filter" value={team} onChange={(e) => onTeamChange(e.target.value)}>
          <option value="all">All teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <ul className={`roster-list${isOver ? ' drop-target' : ''}`}>
        {members.map((member) => (
          <RosterMember
            key={member.id}
            member={member}
            onEdit={() => onEdit(member)}
            onDelete={() => onDelete(member)}
          />
        ))}
        {members.length === 0 && <li className="empty">No members yet.</li>}
      </ul>
      <p className="hint">Drag a name onto a trip. Keyboard: tab to ⠿, press space, arrow across, space to drop.</p>
    </section>
  )
}
