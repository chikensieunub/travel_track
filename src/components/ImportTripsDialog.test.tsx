import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import writeXlsxFile from 'write-excel-file/node'
import App from '../App'

type User = ReturnType<typeof userEvent.setup>

/** Build a sheet shaped like the real one: trip blocks side by side. */
async function tripsFile(blocks: { title: string; names: string[] }[]): Promise<File> {
  const height = Math.max(...blocks.map((b) => b.names.length)) + 2
  const grid: (string | null)[][] = []
  for (let r = 0; r < height; r += 1) {
    const row: (string | null)[] = []
    for (const b of blocks) {
      if (r === 0) row.push(b.title, null, null)
      else if (r === 1) row.push('No.', 'Full name', 'Sex')
      else {
        const name = b.names[r - 2]
        row.push(name ? String(r - 1) : null, name ?? null, name ? 'Nam' : null)
      }
      row.push(null)
    }
    grid.push(row)
  }
  const sheet = grid.map((row) => row.map((value) => ({ value: value ?? '', type: String })))
  const buffer = await writeXlsxFile(sheet).toBuffer()
  return new File([buffer], 'trips.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

const board = () => screen.getByRole('main')
const dialog = () => screen.getByRole('dialog', { name: 'Import trips' })
const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (d: string) => screen.getByRole('article', { name: d })
const importButton = () => within(dialog()).getByRole('button', { name: /^Import \d/ })

async function addMember(user: User, name: string) {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME-' + name.toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  await user.type(screen.getByLabelText('Direct boss'), 'MINHND')
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

async function openTripImport(user: User, file: File) {
  await user.click(within(board()).getByRole('button', { name: 'Import trips' }))
  await user.upload(screen.getByLabelText('Trips file'), file)
  await waitFor(() => expect(importButton()).toBeEnabled())
}

describe('Importing trips from Excel', () => {
  beforeEach(() => localStorage.clear())

  test('lists the trips it found in the file', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTripImport(
      user,
      await tripsFile([
        { title: 'GDC 2026', names: ['Ana', 'Ben'] },
        { title: 'GDC 2025', names: ['Ana'] },
      ]),
    )
    expect(within(dialog()).getByText('GDC 2026')).toBeInTheDocument()
    expect(within(dialog()).getByText('GDC 2025')).toBeInTheDocument()
  })

  test('pre-fills each trip date from the year in its name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana'] }]))
    expect(within(dialog()).getByLabelText('Start date for GDC 2026')).toHaveValue('2026-01-01')
  })

  test('nothing reaches the board until Import is pressed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana'] }]))
    expect(screen.queryByRole('article', { name: 'GDC 2026' })).not.toBeInTheDocument()
  })

  test('imports the trips onto the board', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana'] }]))
    await user.click(importButton())

    await waitFor(() => expect(screen.getByRole('article', { name: 'GDC 2026' })).toBeInTheDocument())
  })

  test('uses the dates typed in the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana'] }]))

    const date = within(dialog()).getByLabelText('Start date for GDC 2026')
    await user.clear(date)
    await user.type(date, '2026-05-04')
    const days = within(dialog()).getByLabelText('Days for GDC 2026')
    await user.clear(days)
    await user.type(days, '3')
    await user.click(importButton())

    await waitFor(() => expect(screen.getByRole('article', { name: 'GDC 2026' })).toBeInTheDocument())
    expect(within(card('GDC 2026')).getByText('4 May 2026 → 6 May 2026 · 3 days')).toBeInTheDocument()
  })

  test('puts a person already in the roster onto the trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana'] }]))
    await user.click(importButton())

    await waitFor(() => expect(screen.getByRole('article', { name: 'GDC 2026' })).toBeInTheDocument())
    const panel = within(card('GDC 2026')).getByRole('group', { name: /^Confirmed/ })
    expect(within(panel).getByText('Ana')).toBeInTheDocument()
  })

  test('puts an unrecognised person in the left-the-company panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana', 'Le Duy'] }]))
    await user.click(importButton())

    await waitFor(() => expect(screen.getByRole('article', { name: 'GDC 2026' })).toBeInTheDocument())
    const gone = within(card('GDC 2026')).getByRole('group', { name: /^Left the company/ })
    expect(within(gone).getByText('Le Duy')).toBeInTheDocument()
  })

  test('says how many people matched and how many did not', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana', 'Le Duy'] }]))
    expect(within(dialog()).getByText(/1 matched/i)).toBeInTheDocument()
    expect(within(dialog()).getByText(/1 not in the roster/i)).toBeInTheDocument()
  })

  test('re-importing the same file does not duplicate the trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    const file = () => tripsFile([{ title: 'GDC 2026', names: ['Ana'] }])

    await openTripImport(user, await file())
    await user.click(importButton())
    await waitFor(() => expect(screen.getByRole('article', { name: 'GDC 2026' })).toBeInTheDocument())

    await openTripImport(user, await file())
    await user.click(importButton())
    await waitFor(() => expect(screen.getAllByRole('article', { name: 'GDC 2026' })).toHaveLength(1))
  })

  test('closing without importing leaves the board untouched', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTripImport(user, await tripsFile([{ title: 'GDC 2026', names: ['Ana'] }]))
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'GDC 2026' })).not.toBeInTheDocument()
  })

  test('explains itself when the file holds no recognisable trips', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(board()).getByRole('button', { name: 'Import trips' }))

    const sheet = [[{ value: 'nothing useful here', type: String }]]
    const buffer = await writeXlsxFile(sheet).toBuffer()
    await user.upload(
      screen.getByLabelText('Trips file'),
      new File([buffer], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    )

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(/no trips/i)
  })
})
