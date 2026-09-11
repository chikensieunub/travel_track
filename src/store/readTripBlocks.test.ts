import { describe, test, expect } from 'vitest'
import { readTripBlocks, yearFromTitle } from './readTripBlocks'

/** The layout in the real file: a merged title, then No. / Full name / Sex. */
const block = (title: string, names: string[]): unknown[][] => [
  [title, null, null],
  ['No.', 'Full name', 'Sex'],
  ...names.map((n, i) => [i + 1, n, 'Nam']),
]

/** Lay blocks out side by side with a blank spacer column between them. */
function sideBySide(blocks: unknown[][][], gap = 1): unknown[][] {
  const height = Math.max(...blocks.map((b) => b.length))
  const rows: unknown[][] = []
  for (let r = 0; r < height; r += 1) {
    const row: unknown[] = []
    for (const b of blocks) {
      const cells = b[r] ?? [null, null, null]
      row.push(...cells)
      for (let g = 0; g < gap; g += 1) row.push(null)
    }
    rows.push(row)
  }
  return rows
}

describe('readTripBlocks', () => {
  test('reads a single trip block', () => {
    const found = readTripBlocks(block('GDC 2026', ['Nguyễn Khánh Trung', 'Nguyễn Đăng Khoa']))
    expect(found).toHaveLength(1)
    expect(found[0].title).toBe('GDC 2026')
    expect(found[0].names).toEqual(['Nguyễn Khánh Trung', 'Nguyễn Đăng Khoa'])
  })

  test('reads several blocks laid out side by side', () => {
    const grid = sideBySide([
      block('GDC 2026', ['Ana', 'Ben']),
      block('GDC 2025', ['Chen']),
      block('GDC 2024', ['Dia', 'Eve', 'Fay']),
    ])
    const found = readTripBlocks(grid)
    expect(found.map((b) => b.title)).toEqual(['GDC 2026', 'GDC 2025', 'GDC 2024'])
    expect(found.map((b) => b.names.length)).toEqual([2, 1, 3])
  })

  test('copes with wider gaps between blocks', () => {
    const grid = sideBySide([block('A', ['Ana']), block('B', ['Ben'])], 3)
    expect(readTripBlocks(grid).map((b) => b.title)).toEqual(['A', 'B'])
  })

  test('finds the title when a merged cell puts it left of the name column', () => {
    // A merged B2:D2 title reports its value only in the leftmost cell.
    const grid = [
      ['GDC 2026', null, null],
      ['No.', 'Full name', 'Sex'],
      [1, 'Ana', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].title).toBe('GDC 2026')
  })

  test('finds the title when it sits directly above the name column', () => {
    const grid = [
      [null, 'GDC 2026', null],
      ['No.', 'Full name', 'Sex'],
      [1, 'Ana', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].title).toBe('GDC 2026')
  })

  test('stops a block at the first blank name', () => {
    const grid = [
      ['GDC 2026', null, null],
      ['No.', 'Full name', 'Sex'],
      [1, 'Ana', 'Nam'],
      [2, '', ''],
      [3, 'Should not be read', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].names).toEqual(['Ana'])
  })

  test('ignores the No. and Sex columns', () => {
    const found = readTripBlocks(block('GDC 2026', ['Ana']))
    expect(found[0].names).toEqual(['Ana'])
  })

  test('trims and collapses whitespace in names', () => {
    const grid = [
      ['GDC 2026', null, null],
      ['No.', 'Full name', 'Sex'],
      [1, '  Nguyễn   Khánh  Trung  ', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].names).toEqual(['Nguyễn Khánh Trung'])
  })

  test('recognises the header however it is capitalised', () => {
    const grid = [
      ['GDC 2026', null, null],
      ['NO.', 'FULL NAME', 'SEX'],
      [1, 'Ana', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].names).toEqual(['Ana'])
  })

  test('accepts "Name" as well as "Full name"', () => {
    const grid = [
      ['GDC 2026', null, null],
      ['No.', 'Name', 'Sex'],
      [1, 'Ana', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].names).toEqual(['Ana'])
  })

  test('reads numeric names as text rather than dropping them', () => {
    const grid = [
      ['Trip', null, null],
      ['No.', 'Full name', 'Sex'],
      [1, 12345, 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].names).toEqual(['12345'])
  })

  test('drops a block with no names at all', () => {
    const grid = [
      ['Empty trip', null, null],
      ['No.', 'Full name', 'Sex'],
    ]
    expect(readTripBlocks(grid)).toEqual([])
  })

  test('falls back to a positional name when a block has no title', () => {
    const grid = [
      [null, null, null],
      ['No.', 'Full name', 'Sex'],
      [1, 'Ana', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].title).toBe('Trip 1')
  })

  test('does not repeat the same person within one trip', () => {
    const grid = [
      ['GDC 2026', null, null],
      ['No.', 'Full name', 'Sex'],
      [1, 'Ana', 'Nam'],
      [2, 'Ana', 'Nam'],
    ]
    expect(readTripBlocks(grid)[0].names).toEqual(['Ana'])
  })

  test('an empty sheet yields no blocks', () => {
    expect(readTripBlocks([])).toEqual([])
  })
})

describe('yearFromTitle', () => {
  test('reads a four-digit year out of a trip name', () => {
    expect(yearFromTitle('GDC 2026')).toBe(2026)
  })

  test('finds a year anywhere in the name', () => {
    expect(yearFromTitle('2024 Tokyo summit')).toBe(2024)
  })

  test('ignores numbers that are not plausible years', () => {
    expect(yearFromTitle('Team 42 offsite')).toBeUndefined()
    expect(yearFromTitle('Route 66')).toBeUndefined()
  })

  test('gives nothing when there is no year', () => {
    expect(yearFromTitle('Tokyo install')).toBeUndefined()
  })
})
