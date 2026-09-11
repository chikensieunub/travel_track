import { describe, test, expect } from 'vitest'
import writeXlsxFile from 'write-excel-file/node'
import { readGrid, readSheet } from './readSheet'

async function xlsx(grid: string[][]): Promise<File> {
  const sheet = grid.map((row) => row.map((value) => ({ value, type: String })))
  const buffer = await writeXlsxFile(sheet).toBuffer()
  return new File([buffer], 'members.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('readSheet', () => {
  test('takes the first row as headers', async () => {
    const sheet = await readSheet(await xlsx([['Domain Name', 'Full Name'], ['a-b', 'Ana']]))
    expect(sheet.headers).toEqual(['Domain Name', 'Full Name'])
  })

  test('returns the remaining rows keyed by header', async () => {
    const sheet = await readSheet(await xlsx([['Domain Name', 'Full Name'], ['a-b', 'Ana'], ['c-d', 'Chen']]))
    expect(sheet.rows).toEqual([
      { 'Domain Name': 'a-b', 'Full Name': 'Ana' },
      { 'Domain Name': 'c-d', 'Full Name': 'Chen' },
    ])
  })

  test('a sheet with only headers yields no rows', async () => {
    const sheet = await readSheet(await xlsx([['Domain Name', 'Full Name']]))
    expect(sheet.rows).toEqual([])
  })

  test('rejects a file that is not a spreadsheet', async () => {
    const notASheet = new File(['just some text'], 'notes.xlsx', { type: 'application/vnd.ms-excel' })
    await expect(readSheet(notASheet)).rejects.toThrow(/could not be read/i)
  })
})

describe('readGrid', () => {
  test('returns the sheet as rows of cells', async () => {
    const grid = await readGrid(await xlsx([['A', 'B'], ['1', '2']]))
    expect(grid[0][0]).toBe('A')
    expect(grid[1][1]).toBe('2')
  })

  test('keeps repeated column headings apart, which readSheet cannot', async () => {
    // Trip sheets repeat "Full name" once per block; keyed rows would collide.
    const grid = await readGrid(await xlsx([['Full name', 'Full name'], ['Ana', 'Ben']]))
    expect(grid[1]).toEqual(['Ana', 'Ben'])
  })

  test('rejects a file that is not a spreadsheet', async () => {
    const notASheet = new File(['nope'], 'notes.xlsx', { type: 'application/vnd.ms-excel' })
    await expect(readGrid(notASheet)).rejects.toThrow(/could not be read/i)
  })
})
