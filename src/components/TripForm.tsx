import { useState, type FormEvent } from 'react'
import type { Trip, TripStatus } from '../store/types'

export interface TripDraft {
  destination: string
  startDate: string
  durationDays: number
  purpose: string
  status: TripStatus
  notes: string
}

export function TripForm({
  initial,
  today,
  onSave,
  onCancel,
}: {
  initial?: Trip
  today: string
  onSave: (draft: TripDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<TripDraft>(
    initial
      ? { ...initial }
      : { destination: '', startDate: today, durationDays: 1, purpose: '', status: 'planned', notes: '' },
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.destination.trim() || !draft.startDate) return
    onSave({ ...draft, destination: draft.destination.trim(), durationDays: Math.max(1, draft.durationDays || 1) })
  }

  return (
    <form className="form" onSubmit={submit}>
      <h3>{initial ? 'Edit trip' : 'New trip'}</h3>
      <label htmlFor="trip-destination">Destination</label>
      <input
        id="trip-destination"
        value={draft.destination}
        autoFocus
        onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
      />

      <div className="form-row">
        <div>
          <label htmlFor="trip-start">Start date</label>
          <input
            id="trip-start"
            type="date"
            value={draft.startDate}
            onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="trip-duration">Duration (days)</label>
          <input
            id="trip-duration"
            type="number"
            min={1}
            value={draft.durationDays}
            onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })}
          />
        </div>
      </div>

      <label htmlFor="trip-purpose">Purpose</label>
      <input
        id="trip-purpose"
        value={draft.purpose}
        placeholder="Client visit, install, conference…"
        onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
      />

      <label htmlFor="trip-status">Status</label>
      <select
        id="trip-status"
        value={draft.status}
        onChange={(e) => setDraft({ ...draft, status: e.target.value as TripStatus })}
      >
        <option value="planned">Planned</option>
        <option value="confirmed">Confirmed</option>
        <option value="done">Done</option>
      </select>

      <label htmlFor="trip-notes">Notes</label>
      <textarea
        id="trip-notes"
        rows={2}
        value={draft.notes}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
      />

      <div className="form-actions">
        <button type="submit" className="primary">Save trip</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
