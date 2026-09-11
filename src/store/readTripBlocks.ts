import { cleanName, nameKey } from './names'

export interface TripBlock {
  title: string
  names: string[]
}

/** Header spellings that mark the column holding people's names. */
const NAME_HEADERS = ['full name', 'fullname', 'name', 'member', 'employee', 'họ và tên', 'họ tên', 'tên']

/** Headers around the name column that are part of the table, not a trip title. */
const OTHER_HEADERS = ['no.', 'no', '#', 'stt', 'sex', 'gender', 'giới tính', 'nam/nữ']

/** How far above the header row a title may sit. */
const TITLE_LOOKUP = 3

/** How far left or right of the name column a merged title may start. */
const TITLE_SPREAD = 3

const text = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return cleanName(String(value))
}

const isNameHeader = (value: unknown): boolean => NAME_HEADERS.includes(text(value).toLowerCase())
const isOtherHeader = (value: unknown): boolean => OTHER_HEADERS.includes(text(value).toLowerCase())

/**
 * Read trips out of a sheet laid out as blocks: a title, a header row, then a
 * list of names. Blocks may sit side by side with any gap between them, so each
 * is found from its own "Full name" header rather than from the sheet's shape.
 */
export function readTripBlocks(grid: unknown[][]): TripBlock[] {
  const blocks: TripBlock[] = []

  for (let row = 0; row < grid.length; row += 1) {
    const cells = grid[row] ?? []
    for (let col = 0; col < cells.length; col += 1) {
      if (!isNameHeader(cells[col])) continue

      const names: string[] = []
      const seen = new Set<string>()
      for (let r = row + 1; r < grid.length; r += 1) {
        const name = text((grid[r] ?? [])[col])
        if (!name) break // A blank ends the block; the next one starts elsewhere.
        const key = nameKey(name)
        if (!seen.has(key)) {
          seen.add(key)
          names.push(name)
        }
      }

      if (names.length === 0) continue
      blocks.push({ title: titleAbove(grid, row, col) || `Trip ${blocks.length + 1}`, names })
    }
  }

  return blocks
}

/**
 * The trip's name, from the rows above its header.
 *
 * A merged title reports its value only in the leftmost cell it covers, so this
 * searches sideways as well as up, ignoring the table's own headers.
 */
function titleAbove(grid: unknown[][], headerRow: number, nameCol: number): string {
  for (let r = headerRow - 1; r >= 0 && r >= headerRow - TITLE_LOOKUP; r -= 1) {
    const cells = grid[r] ?? []
    const from = Math.max(0, nameCol - TITLE_SPREAD)
    const to = Math.min(cells.length - 1, nameCol + TITLE_SPREAD)
    // Nearest to the name column wins, so a neighbouring block cannot claim it.
    for (let distance = 0; distance <= TITLE_SPREAD; distance += 1) {
      for (const col of [nameCol - distance, nameCol + distance]) {
        if (col < from || col > to) continue
        const value = text(cells[col])
        if (value && !isNameHeader(value) && !isOtherHeader(value)) return value
      }
    }
  }
  return ''
}

/** A plausible year mentioned in a trip's name, used to pre-fill its date. */
export function yearFromTitle(title: string): number | undefined {
  const match = title.match(/(?:^|\D)(19\d{2}|20\d{2}|21\d{2})(?:\D|$)/)
  return match ? Number(match[1]) : undefined
}
