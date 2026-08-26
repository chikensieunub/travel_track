import { describe, test, expect } from 'vitest'
import writeXlsxFile from 'write-excel-file/node'
import { readSheet } from './readSheet'

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
