import { EXPORT_COLUMNS, type ExportRow } from './exportRows'

export interface Cell {
  value: string | number
  type: StringConstructor | NumberConstructor
  fontWeight?: 'bold'
}

/** Turn export rows into the cell grid write-excel-file expects, headings first. */
export function workbookSheet(rows: ExportRow[]): Cell[][] {
  const heading: Cell[] = EXPORT_COLUMNS.map((column) => ({
    value: column.label,
    type: String,
    fontWeight: 'bold',
  }))

  const body = rows.map((row) =>
    EXPORT_COLUMNS.map((column): Cell => {
      const value = row[column.key]
      return typeof value === 'number' ? { value, type: Number } : { value: String(value ?? ''), type: String }
    }),
  )

  return [heading, ...body]
}

/** Column widths, so the sheet is readable the moment it opens. */
export const workbookColumns = (): { width: number }[] => EXPORT_COLUMNS.map((c) => ({ width: c.width }))
