import { useDroppable } from '@dnd-kit/core'
import type { Member } from '../store/types'
import { RosterMember } from './MemberChip'

export function RosterPanel({
  members,
  query,
  onQueryChange,
  location,
  onLocationChange,
  locations,
  boss,
  onBossChange,
  bosses,
  onAdd,
  onImport,
  onEdit,
  onDelete,
}: {
  members: Member[]
  query: string
  onQueryChange: (value: string) => void
  location: string
  onLocationChange: (value: string) => void
  locations: string[]
  boss: string
  onBossChange: (value: string) => void
  bosses: string[]
  onAdd: () => void
  onImport: () => void
  onEdit: (member: Member) => void
  onDelete: (member: Member) => void
}) {
  // Dropping a person back here takes them off the trip they came from.
  const { setNodeRef, isOver } = useDroppable({ id: 'roster', data: { type: 'roster' } })

  return (
    <section className="roster" aria-label="Members" ref={setNodeRef}>
      <header className="panel-head">
        <h2>Members</h2>
        <div className="panel-head-actions">
          <button className="small" onClick={onImport}>Import members</button>
          <button className="primary small" onClick={onAdd}>Add member</button>
        </div>
      </header>

      <div className="roster-filters">
        <label className="visually-hidden" htmlFor="member-search">Search members</label>
        <input
          id="member-search"
          type="search"
          placeholder="Search name, domain, location…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <div className="filter-pair">
          <label className="visually-hidden" htmlFor="location-filter">Filter by location</label>
          <select id="location-filter" value={location} onChange={(e) => onLocationChange(e.target.value)}>
            <option value="all">All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="boss-filter">Filter by direct boss</label>
          <select id="boss-filter" value={boss} onChange={(e) => onBossChange(e.target.value)}>
            <option value="all">All bosses</option>
            {bosses.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
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
