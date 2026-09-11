import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import readXlsxFile from 'read-excel-file/browser'
import App from '../App'

type User = ReturnType<typeof userEvent.setup>

const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (d = 'Tokyo') => screen.getByRole('article', { name: d })

async function addMember(user: User, name: string, boss = 'Ben Ortiz') {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME-' + name.toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  if (boss) await user.type(screen.getByLabelText('Direct boss'), boss)
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

/** Read a downloaded blob back as a sheet, so the file is proven, not assumed. */
async function readSheetFrom(blob: Blob): Promise<unknown[][]> {
  const file = new File([blob], 'export.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const parsed = (await readXlsxFile(file)) as unknown as { data?: unknown[][] }[]
  const first = parsed[0]
  return first && !Array.isArray(first) && Array.isArray(first.data)
    ? (first.data as unknown[][])
    : (parsed as unknown as unknown[][])
}

/** Capture whatever the page hands to the browser as a download. */
function captureDownload() {
  const captured: { name: string; blob: Blob }[] = []
  const realCreate = URL.createObjectURL
  URL.createObjectURL = vi.fn((blob: Blob) => {
    captured.push({ name: '', blob })
    return 'blob:fake'
  }) as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn()
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    if (captured.length) captured[captured.length - 1].name = this.download
  })
  return {
    captured,
    restore: () => {
      URL.createObjectURL = realCreate
      clicks.mockRestore()
    },
  }
}

describe('Exporting to Excel', () => {
  let download: ReturnType<typeof captureDownload>

  beforeEach(() => {
    localStorage.clear()
    download = captureDownload()
  })
  afterEach(() => download.restore())

  async function setupAndExport(user: User) {
    render(<App />)
    await addMember(user, 'Ana')
    await addMember(user, 'Chen')
    await user.click(screen.getByRole('button', { name: 'Add trip' }))
    await user.type(screen.getByLabelText('Destination'), 'Tokyo')
    await user.clear(screen.getByLabelText('Duration (days)'))
    await user.type(screen.getByLabelText('Duration (days)'), '7')
    await user.click(screen.getByRole('button', { name: 'Save trip' }))
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), 'Ana')
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), 'Chen')
    await user.click(within(card()).getByRole('button', { name: 'Select Chen' }))
    await user.click(within(card()).getByRole('button', { name: /Move down/ }))

    await user.click(screen.getByRole('button', { name: 'Export to Excel' }))
    await waitFor(() => expect(download.captured).toHaveLength(1))
  }

  test('hands the browser a spreadsheet to save', async () => {
    const user = userEvent.setup()
    await setupAndExport(user)
    expect(download.captured[0].name).toMatch(/\.xlsx$/)
  })

  test('the file really is a readable spreadsheet', async () => {
    const user = userEvent.setup()
    await setupAndExport(user)
    const parsed = await readSheetFrom(download.captured[0].blob)
    expect(Array.isArray(parsed)).toBe(true)
  })

  test('the sheet has a heading row and one row per person', async () => {
    const user = userEvent.setup()
    await setupAndExport(user)
    const grid = await readSheetFrom(download.captured[0].blob)

    expect(grid[0][0]).toBe('Destination')
    expect(grid).toHaveLength(3) // heading + Ana + Chen
  })

  test('the sheet holds only the columns asked for', async () => {
    const user = userEvent.setup()
    await setupAndExport(user)
    const grid = await readSheetFrom(download.captured[0].blob)
    expect(grid[0].map(String)).toEqual([
      'Destination',
      'Member',
      'Domain name',
      'Direct boss',
      'Location',
      'On trip',
    ])
  })

  test('the rows carry the trip, the person and their confirmed status', async () => {
    const user = userEvent.setup()
    await setupAndExport(user)
    const grid = await readSheetFrom(download.captured[0].blob)

    const headings = grid[0].map(String)
    const col = (name: string) => headings.indexOf(name)
    const rows = grid.slice(1)

    const ana = rows.find((r) => r[col('Member')] === 'Ana')!
    expect(ana[col('Destination')]).toBe('Tokyo')
    expect(ana[col('Direct boss')]).toBe('Ben Ortiz')
    // Nothing was recorded for her location, so the cell comes back empty.
    expect(ana[col('Location')]).toBeNull()
    expect(ana[col('On trip')]).toBe('Confirmed')

    const chen = rows.find((r) => r[col('Member')] === 'Chen')!
    expect(chen[col('On trip')]).toBe('Tentative')
  })
})

describe('The toolbar buttons', () => {
  beforeEach(() => localStorage.clear())

  test('names the Excel export for what it does', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Export to Excel' })).toBeInTheDocument()
  })

  test('calls the JSON pair backup and restore, not export and import', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Back up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
  })

  test('each import button sits in the panel it imports into', () => {
    render(<App />)
    expect(within(roster()).getByRole('button', { name: 'Import members' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('button', { name: 'Import trips' })).toBeInTheDocument()
  })

  test('the two imports are named for what they bring in, not for the file type', () => {
    render(<App />)
    const names = screen.getAllByRole('button', { name: /import/i }).map((b) => b.textContent)
    expect(names.sort()).toEqual(['Import members', 'Import trips'])
  })
})
