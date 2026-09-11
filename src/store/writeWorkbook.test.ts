import { describe, test, expect } from 'vitest'
import { workbookSheet } from './writeWorkbook'
import { EXPORT_COLUMNS, exportRows } from './exportRows'
import { addMember, addTrip, assign, emptyData } from './operations'
import type { TravelData } from './types'

function built(): TravelData {
  let d = emptyData()
  d = addMember(d, { domainName: 'ACME-acruz', fullName: 'Ana Cruz', directBoss: 'Ben Ortiz', location: 'Manila' })
  d = addTrip(d, { destination: 'Tokyo', startDate: '2026-10-05', durationDays: 7, purpose: 'Install' })
  d = assign(d, d.trips[0].id, d.members[0].id)
  return d
}

describe('workbookSheet', () => {
  test('starts with a heading row naming every column', () => {
    const sheet = workbookSheet(exportRows(built()))
    expect(sheet[0].map((cell) => cell.value)).toEqual(EXPORT_COLUMNS.map((c) => c.label))
  })

  test('writes one row per exported row, after the heading', () => {
    const rows = exportRows(built())
    expect(workbookSheet(rows)).toHaveLength(rows.length + 1)
  })

  test('carries the values through in column order', () => {
    const sheet = workbookSheet(exportRows(built()))
    const values = sheet[1].map((cell) => cell.value)
    expect(values[0]).toBe('Tokyo')
    expect(values[3]).toBe(7)
    expect(values[6]).toBe('Ana Cruz')
    expect(values[10]).toBe('Confirmed')
  })

  test('writes the day count as a number, so Excel can total it', () => {
    const sheet = workbookSheet(exportRows(built()))
    expect(sheet[1][3].type).toBe(Number)
  })

  test('writes text columns as text', () => {
    const sheet = workbookSheet(exportRows(built()))
    expect(sheet[1][0].type).toBe(String)
  })

  test('an empty tracker still produces a heading row', () => {
    expect(workbookSheet([])).toHaveLength(1)
  })
})
