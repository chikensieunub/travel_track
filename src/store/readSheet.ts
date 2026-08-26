import readXlsxFile from 'read-excel-file/browser'
import type { SheetRow } from './importMembers'

export interface Sheet {
  headers: string[]
  rows: SheetRow[]
}

const cell = (value: unknown): unknown => (value === null || value === undefined ? '' : value)

/** read-excel-file returns either rows, or a list of {sheet, data}. Accept both. */
function firstSheetGrid(parsed: unknown): unknown[][] {
  if (!Array.isArray(parsed) || parsed.length === 0) return []
  const first = parsed[0] as { data?: unknown }
  if (first && !Array.isArray(first) && Array.isArray(first.data)) return first.data as unknown[][]
  return parsed as unknown[][]
}

/**
 * Read the first worksheet, treating row one as headers.
 *
 * Blank header cells become "Column 3" and so on, so every column can still be
 * chosen in the mapping step rather than silently disappearing.
 */
export async function readSheet(file: File): Promise<Sheet> {
  let parsed: unknown
  try {
    parsed = await readXlsxFile(file)
  } catch {
    throw new Error('The file could not be read as a spreadsheet. Save it as .xlsx and try again.')
  }

  const grid = firstSheetGrid(parsed)
  if (grid.length === 0) throw new Error('That spreadsheet is empty.')

  const headers = grid[0].map((value, index) => {
    const text = String(cell(value)).trim()
    return text || `Column ${index + 1}`
  })

  const rows: SheetRow[] = grid.slice(1).map((line) => {
    const row: SheetRow = {}
    headers.forEach((header, index) => {
      row[header] = cell(line[index])
    })
    return row
  })

  return { headers, rows }
}
