import { useState, type FormEvent } from 'react'
import type { Member } from '../store/types'

export interface MemberDraft {
  name: string
  team: string
  role: string
  active: boolean
}

const blank: MemberDraft = { name: '', team: '', role: '', active: true }

export function MemberForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Member
  onSave: (draft: MemberDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<MemberDraft>(initial ? { ...initial } : blank)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) return
    onSave({ ...draft, name: draft.name.trim() })
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>{initial ? 'Edit member' : 'New member'}</h3>
      <label htmlFor="member-name">Name</label>
      <input
        id="member-name"
        value={draft.name}
        autoFocus
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />

      <label htmlFor="member-team">Team</label>
      <input id="member-team" value={draft.team} onChange={(e) => setDraft({ ...draft, team: e.target.value })} />

      <label htmlFor="member-role">Role</label>
      <input id="member-role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />

      <label className="checkbox">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        Currently on the team
      </label>

      <div className="form-actions">
        <button type="submit" className="primary">Save member</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
