import { useMemo, useState, type ChangeEvent } from 'react'
import type { MemberDraft, TravelData } from '../store/types'
import { IMPORT_FIELDS, matchColumns, rowsToDrafts, type ColumnMapping, type SheetRow } from '../store/importMembers'
import { previewMerge } from '../store/mergeMembers'
import { readSheet } from '../store/readSheet'

const PREVIEW_ROWS = 5

export function ImportMembersDialog({
  data,
  onImport,
  onClose,
}: {
  data: TravelData
  onImport: (drafts: MemberDraft[]) => void
  onClose: () => void
}) {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<SheetRow[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setReading(true)
    setError(null)
    setFileName(file.name)
    try {
      const sheet = await readSheet(file)
      setHeaders(sheet.headers)
      setRows(sheet.rows)
      setMapping(matchColumns(sheet.headers))
    } catch (e) {
      setHeaders([])
      setRows([])
      setMapping({})
      setError(e instanceof Error ? e.message : 'The file could not be read.')
    } finally {
      setReading(false)
    }
  }

  const { drafts, skipped, duplicates } = useMemo(() => rowsToDrafts(rows, mapping), [rows, mapping])
  const { added, updated } = useMemo(() => previewMerge(data, drafts), [data, drafts])

  const ready = Boolean(mapping.domainName) && drafts.length > 0

  return (
    <div className="form import-dialog" role="dialog" aria-modal="true" aria-label="Import members">
      <h3>Import members</h3>
      <p className="hint">
        Pick an Excel file (.xlsx). Row one should be your column headings. Nothing changes until you press Import.
      </p>

      <label htmlFor="import-file">Excel file</label>
      <input id="import-file" type="file" accept=".xlsx" onChange={chooseFile} />
      {fileName && !error && <p className="hint">{fileName}</p>}

      {error && (
        <div role="alert" className="banner banner-warn">
          {error}
        </div>
      )}

      {reading && <p className="hint">Reading…</p>}

      {headers.length > 0 && (
        <>
          <h4>Columns</h4>
          <div className="mapping-grid">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key}>
                <label htmlFor={`map-${field.key}`}>{field.label} column</label>
                <select
                  id={`map-${field.key}`}
                  value={mapping[field.key] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value || undefined })}
                >
                  <option value="">— not imported —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!mapping.domainName && (
            <p className="hint warn-text">
              Choose which column holds the domain name — it is how people are matched.
            </p>
          )}

          <h4>Preview</h4>
          <div className="table-scroll">
            <table className="preview" aria-label="Preview">
              <thead>
                <tr>
                  {IMPORT_FIELDS.map((f) => (
                    <th key={f.key} scope="col">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drafts.slice(0, PREVIEW_ROWS).map((d) => (
                  <tr key={d.domainName}>
                    <td>{d.domainName}</td>
                    <td>{d.fullName}</td>
                    <td>{d.directBoss}</td>
                    <td>{d.location}</td>
                  </tr>
                ))}
                {drafts.length === 0 && (
                  <tr>
                    <td colSpan={IMPORT_FIELDS.length}>Nothing to import from this file yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {drafts.length > PREVIEW_ROWS && (
            <p className="hint">…and {drafts.length - PREVIEW_ROWS} more.</p>
          )}

          <p className="import-summary">
            <strong>{added} to add</strong> · <strong>{updated} to update</strong>
            {skipped > 0 && <> · {skipped} skipped (no domain name)</>}
            {duplicates.length > 0 && <> · {duplicates.length} duplicate rows, last one wins</>}
          </p>
          <p className="hint">Anyone already in the roster but missing from this file is left untouched.</p>
        </>
      )}

      <div className="form-actions">
        <button type="button" className="primary" disabled={!ready} onClick={() => onImport(drafts)}>
          {ready ? `Import ${drafts.length} ${drafts.length === 1 ? 'member' : 'members'}` : 'Import'}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}
