import { useMemo, useState, type ChangeEvent } from 'react'
import type { TravelData } from '../store/types'
import { readGrid } from '../store/readSheet'
import { readTripBlocks, yearFromTitle, type TripBlock } from '../store/readTripBlocks'
import { matchNames, type TripImport } from '../store/importTrips'

interface Draft extends TripBlock {
  startDate: string
  /** Held as typed, so the box can be emptied and retyped; coerced on import. */
  days: string
}

/** A trip named for a year starts on 1 January of it until told otherwise. */
function draftFrom(block: TripBlock, today: string): Draft {
  const year = yearFromTitle(block.title)
  return {
    ...block,
    startDate: year ? `${year}-01-01` : today,
    days: '1',
  }
}

export function ImportTripsDialog({
  data,
  today,
  onImport,
  onClose,
}: {
  data: TravelData
  today: string
  onImport: (trips: TripImport[]) => void
  onClose: () => void
}) {
  const [fileName, setFileName] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setReading(true)
    setError(null)
    setFileName(file.name)
    try {
      // Read positionally: several blocks repeat the same "Full name" heading.
      const blocks = readTripBlocks(await readGrid(file))
      if (blocks.length === 0) {
        throw new Error('Found no trips in that file. Each trip needs a name above a "Full name" column.')
      }
      setDrafts(blocks.map((b) => draftFrom(b, today)))
    } catch (e) {
      setDrafts([])
      setError(e instanceof Error ? e.message : 'The file could not be read.')
    } finally {
      setReading(false)
    }
  }

  const update = (title: string, patch: Partial<Draft>) =>
    setDrafts((current) => current.map((d) => (d.title === title ? { ...d, ...patch } : d)))

  const summary = useMemo(() => {
    const everyone = [...new Set(drafts.flatMap((d) => d.names))]
    const { matched, unmatched } = matchNames(data, everyone)
    const existing = new Set(data.trips.map((t) => t.destination.trim().toLowerCase()))
    return {
      people: everyone.length,
      matched: matched.length,
      unmatched: unmatched.length,
      updating: drafts.filter((d) => existing.has(d.title.trim().toLowerCase())).length,
    }
  }, [drafts, data])

  const ready = drafts.length > 0 && drafts.every((d) => d.startDate)

  return (
    <div className="form import-dialog" role="dialog" aria-modal="true" aria-label="Import trips">
      <h3>Import trips</h3>
      <p className="hint">
        Pick an Excel file (.xlsx) holding one block per trip: the trip's name above a <b>Full name</b> column.
        Blocks can sit side by side. Nothing changes until you press Import.
      </p>

      <label htmlFor="trips-file">Trips file</label>
      <input id="trips-file" type="file" accept=".xlsx" onChange={chooseFile} />
      {fileName && !error && <p className="hint">{fileName}</p>}

      {error && (
        <div role="alert" className="banner banner-warn">
          {error}
        </div>
      )}

      {reading && <p className="hint">Reading…</p>}

      {drafts.length > 0 && (
        <>
          <h4>Trips found</h4>
          <p className="hint">
            The file has no dates, so each trip starts on 1 January of the year in its name. Correct any that matter —
            a trip already on the board keeps the dates you gave it.
          </p>
          <div className="table-scroll">
            <table className="preview" aria-label="Trips found">
              <thead>
                <tr>
                  <th scope="col">Trip</th>
                  <th scope="col">Start date</th>
                  <th scope="col">Days</th>
                  <th scope="col">People</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.title}>
                    <td>{draft.title}</td>
                    <td>
                      <label className="visually-hidden" htmlFor={`start-${draft.title}`}>
                        Start date for {draft.title}
                      </label>
                      <input
                        id={`start-${draft.title}`}
                        type="date"
                        value={draft.startDate}
                        onChange={(e) => update(draft.title, { startDate: e.target.value })}
                      />
                    </td>
                    <td>
                      <label className="visually-hidden" htmlFor={`days-${draft.title}`}>
                        Days for {draft.title}
                      </label>
                      <input
                        id={`days-${draft.title}`}
                        type="number"
                        min={1}
                        className="days-input"
                        value={draft.days}
                        onChange={(e) => update(draft.title, { days: e.target.value })}
                      />
                    </td>
                    <td>{draft.names.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="import-summary">
            <strong>{summary.people} people</strong> · {summary.matched} matched ·{' '}
            {summary.unmatched} not in the roster
            {summary.updating > 0 && <> · {summary.updating} existing trips will be updated</>}
          </p>
          <p className="hint">
            People the roster does not know are added with "Currently on the team" unticked, and appear on the card
            under <b>Left the company</b>.
          </p>
        </>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="primary"
          disabled={!ready}
          onClick={() =>
            onImport(
              drafts.map((d) => ({
                title: d.title,
                startDate: d.startDate,
                durationDays: Math.max(1, Math.round(Number(d.days) || 1)),
                names: d.names,
              })),
            )
          }
        >
          {ready ? `Import ${drafts.length} ${drafts.length === 1 ? 'trip' : 'trips'}` : 'Import'}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
