import { describe, test, expect } from 'vitest'
import readXlsxFile from 'read-excel-file/node'
import { readTripBlocks } from './readTripBlocks'

/** Parses the checked-in sample, which mirrors the real file's layout. */
describe('the sample trips file', () => {
  test('yields one block per trip, with its people', async () => {
    const parsed = (await readXlsxFile('sample-trips.xlsx')) as unknown as { data?: unknown[][] }[]
    const first = parsed[0]
    const grid = first && !Array.isArray(first) && Array.isArray(first.data)
      ? (first.data as unknown[][])
      : (parsed as unknown as unknown[][])

    const blocks = readTripBlocks(grid)
    expect(blocks.map((b) => b.title)).toEqual(['GDC 2026', 'GDC 2025', 'GDC 2024', 'GDC 2023'])
    expect(blocks.every((b) => b.names.length === 3)).toBe(true)
    expect(blocks[3].names).toContain('Lê Duy')
  })
})
