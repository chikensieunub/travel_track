import { useState, type FormEvent } from 'react'
import type { Member, MemberDraft } from '../store/types'

const blank: MemberDraft = { domainName: '', fullName: '', directBoss: '', location: '', active: true }

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
  const set = (patch: Partial<MemberDraft>) => setDraft({ ...draft, ...patch })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const domainName = draft.domainName.trim()
    if (!domainName) return
    onSave({
      ...draft,
      domainName,
      fullName: draft.fullName.trim() || domainName,
      directBoss: draft.directBoss.trim(),
      location: draft.location.trim(),
    })
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>{initial ? 'Edit member' : 'New member'}</h3>

      <div className="form-row">
        <div>
          <label htmlFor="member-domain">Domain name</label>
          <input
            id="member-domain"
            value={draft.domainName}
            autoFocus
            placeholder="ACME\acruz"
            onChange={(e) => set({ domainName: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="member-full-name">Full name</label>
          <input id="member-full-name" value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label htmlFor="member-boss">Direct boss</label>
          <input id="member-boss" value={draft.directBoss} onChange={(e) => set({ directBoss: e.target.value })} />
        </div>
        <div>
          <label htmlFor="member-location">Location</label>
          <input id="member-location" value={draft.location} onChange={(e) => set({ location: e.target.value })} />
        </div>
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={draft.active} onChange={(e) => set({ active: e.target.checked })} />
        Currently on the team
      </label>

      <div className="form-actions">
        <button type="submit" className="primary">Save member</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
