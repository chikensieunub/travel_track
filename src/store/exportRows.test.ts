import { describe, test, expect } from 'vitest'
import { EXPORT_COLUMNS, exportRows } from './exportRows'
import { addMember, addTrip, assign, emptyData } from './operations'
import type { TravelData } from './types'
import { BOSS_NAME } from './boss'

function built(): TravelData {
  let d = emptyData()
  d = addMember(d, { domainName: 'ACME\\acruz', fullName: 'Ana Cruz', directBoss: 'Ben Ortiz', location: 'Manila' })
  d = addMember(d, { domainName: 'ACME\\cwong', fullName: 'Chen Wong', directBoss: 'Ben Ortiz', location: 'Hanoi' })
  d = addTrip(d, {
    destination: 'Tokyo',
    startDate: '2026-10-05',
    durationDays: 7,
    purpose: 'Install',
    status: 'confirmed',
  })
  const tokyo = d.trips[0].id
  d = assign(d, tokyo, d.members[0].id)
  d = assign(d, tokyo, d.members[1].id, 'tentative')
  return d
}

describe('exportRows', () => {
  test('gives one row per person per trip', () => {
    expect(exportRows(built())).toHaveLength(2)
  })

  test('names the trip on every row', () => {
    expect(exportRows(built())[0].destination).toBe('Tokyo')
  })

  test('leaves out the trip dates and status, which the sheet does not need', () => {
    const [first] = exportRows(built())
    for (const gone of ['startDate', 'endDate', 'durationDays', 'tripStatus', 'purpose']) {
      expect(first[gone]).toBeUndefined()
    }
  })

  test('carries the person details onto their row', () => {
    const ana = exportRows(built()).find((r) => r.fullName === 'Ana Cruz')!
    expect(ana.domainName).toBe('ACME\\acruz')
    expect(ana.directBoss).toBe('Ben Ortiz')
    expect(ana.location).toBe('Manila')
  })

  test('says whether each person is confirmed or tentative', () => {
    const rows = exportRows(built())
    expect(rows.find((r) => r.fullName === 'Ana Cruz')!.onTrip).toBe('Confirmed')
    expect(rows.find((r) => r.fullName === 'Chen Wong')!.onTrip).toBe('Tentative')
  })

  test('a trip with nobody on it still appears, so it is not lost from the export', () => {
    let d = emptyData()
    d = addTrip(d, { destination: 'Lisbon', startDate: '2026-01-05', durationDays: 3 })
    const rows = exportRows(d)
    expect(rows).toHaveLength(1)
    expect(rows[0].destination).toBe('Lisbon')
    expect(rows[0].fullName).toBe('')
    expect(rows[0].onTrip).toBe('')
  })

  test('orders by trip date, then confirmed before tentative, then by name', () => {
    let d = built()
    d = addTrip(d, { destination: 'Berlin', startDate: '2026-04-02', durationDays: 2 })
    const berlin = d.trips.find((t) => t.destination === 'Berlin')!.id
    d = assign(d, berlin, d.members[1].id)

    const rows = exportRows(d)
    expect(rows.map((r) => `${r.destination}:${r.fullName}`)).toEqual([
      'Berlin:Chen Wong',
      'Tokyo:Ana Cruz',
      'Tokyo:Chen Wong',
    ])
  })

  test('an empty tracker exports no rows', () => {
    expect(exportRows(emptyData())).toEqual([])
  })

  test('every column has a heading, and every row fills them all', () => {
    const rows = exportRows(built())
    for (const row of rows) {
      for (const column of EXPORT_COLUMNS) {
        expect(row[column.key]).toBeDefined()
      }
    }
  })

  test('the columns lead with the trip, then the person', () => {
    expect(EXPORT_COLUMNS.map((c) => c.key)).toEqual([
      'destination',
      'fullName',
      'domainName',
      'directBoss',
      'location',
      'onTrip',
    ])
  })
})

describe('everyone on a trip reaches the sheet', () => {
  // Rows used to be gathered panel by panel, so anyone the panels skipped was
  // silently missing from the report.
  function mixed(): TravelData {
    let d = emptyData()
    d = addMember(d, { domainName: 'A', fullName: 'Ana Cruz', directBoss: 'Ben', active: true })
    d = addMember(d, { domainName: 'B', fullName: 'Gone Person', directBoss: 'Ben', active: false })
    d = addMember(d, { domainName: 'C', fullName: BOSS_NAME, active: false })
    d = addTrip(d, { destination: 'Tokyo', startDate: '2026-10-05', durationDays: 3 })
    const tokyo = d.trips[0].id
    for (const m of d.members) d = assign(d, tokyo, m.id)
    return d
  }

  test('includes someone who has left', () => {
    expect(exportRows(mixed()).map((r) => r.fullName)).toContain('Gone Person')
  })

  test('says that they left', () => {
    const row = exportRows(mixed()).find((r) => r.fullName === 'Gone Person')!
    expect(row.onTrip).toBe('Left the company')
  })

  test('includes the boss, whose record is flagged differently from everyone', () => {
    expect(exportRows(mixed()).map((r) => r.fullName)).toContain(BOSS_NAME)
  })

  test('marks the boss as the boss', () => {
    const row = exportRows(mixed()).find((r) => r.fullName === BOSS_NAME)!
    expect(row.onTrip).toBe('Boss')
  })

  test('loses nobody who is on the trip', () => {
    expect(exportRows(mixed())).toHaveLength(3)
  })

  test('orders the rows the way the card reads', () => {
    expect(exportRows(mixed()).map((r) => r.onTrip)).toEqual(['Boss', 'Confirmed', 'Left the company'])
  })
})
