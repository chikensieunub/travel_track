import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import writeXlsxFile from 'write-excel-file/node'
import App from '../App'

/** Build a real .xlsx in memory, so the parser is exercised rather than mocked. */
async function xlsxFile(
  headers: string[],
  rows: (string | number)[][],
  filename = 'members.xlsx',
): Promise<File> {
  const sheet = [
    headers.map((value) => ({ value, type: String })),
    ...rows.map((row) => row.map((value) => ({ value: String(value), type: String }))),
  ]
  const buffer = await writeXlsxFile(sheet).toBuffer()
  return new File([buffer], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

const STANDARD = ['Domain Name', 'Full Name', 'Direct Boss', 'Location']

const roster = () => screen.getByRole('region', { name: 'Members' })
const dialog = () => screen.getByRole('dialog', { name: 'Import members' })

async function openImport(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.click(within(roster()).getByRole('button', { name: 'Import members' }))
  await user.upload(screen.getByLabelText('Excel file'), file)
  await waitFor(() => expect(within(dialog()).getByRole('button', { name: /^Import/ })).toBeEnabled())
}

describe('Importing members from Excel', () => {
  beforeEach(() => localStorage.clear())

  test('imports the people in the file into the roster', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(
      user,
      await xlsxFile(STANDARD, [
        ['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila'],
        ['ACME\\cwong', 'Chen Wong', 'Ben Ortiz', 'Hanoi'],
      ]),
    )
    await user.click(within(dialog()).getByRole('button', { name: /^Import/ }))

    await waitFor(() => expect(within(roster()).getByText('Ana Cruz')).toBeInTheDocument())
    expect(within(roster()).getByText('Chen Wong')).toBeInTheDocument()
  })

  test('shows how many people will be added before anything is imported', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(user, await xlsxFile(STANDARD, [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila']]))

    expect(within(dialog()).getByText(/1 to add/i)).toBeInTheDocument()
    // Nothing has reached the roster yet.
    expect(within(roster()).queryByText('Ana Cruz')).not.toBeInTheDocument()
  })

  test('previews the first rows of the file', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(user, await xlsxFile(STANDARD, [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila']]))

    const preview = within(dialog()).getByRole('table', { name: 'Preview' })
    expect(within(preview).getByText('Ana Cruz')).toBeInTheDocument()
    expect(within(preview).getByText('Manila')).toBeInTheDocument()
  })

  test('recognises alternative column headings without being told', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(
      user,
      await xlsxFile(['Username', 'Employee', 'Manager', 'Office'], [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila']]),
    )
    await user.click(within(dialog()).getByRole('button', { name: /^Import/ }))

    await waitFor(() => expect(within(roster()).getByText('Ana Cruz')).toBeInTheDocument())
  })

  test('lets an unrecognised column be mapped by hand', async () => {
    const user = userEvent.setup()
    render(<App />)
    // Not via openImport: with no recognisable domain column, Import stays disabled
    // until the mapping below is made by hand.
    await user.click(within(roster()).getByRole('button', { name: 'Import members' }))
    await user.upload(
      screen.getByLabelText('Excel file'),
      await xlsxFile(['Widget', 'Full Name'], [['ACME\\acruz', 'Ana Cruz']]),
    )
    await waitFor(() => expect(within(dialog()).getByLabelText('Domain name column')).toBeInTheDocument())

    // "Widget" means nothing to us, so domain name starts unmapped.
    const domainSelect = within(dialog()).getByLabelText('Domain name column')
    expect(domainSelect).toHaveValue('')
    await user.selectOptions(domainSelect, 'Widget')
    await user.click(within(dialog()).getByRole('button', { name: /^Import/ }))

    await waitFor(() => expect(within(roster()).getByText('Ana Cruz')).toBeInTheDocument())
  })

  test('cannot import while the domain name column is unmapped', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(roster()).getByRole('button', { name: 'Import members' }))
    await user.upload(screen.getByLabelText('Excel file'), await xlsxFile(['Widget', 'Gadget'], [['a', 'b']]))

    await waitFor(() => expect(within(dialog()).getByRole('button', { name: /^Import/ })).toBeDisabled())
  })

  test('updates someone already in the roster rather than duplicating them', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(user, await xlsxFile(STANDARD, [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila']]))
    await user.click(within(dialog()).getByRole('button', { name: /^Import/ }))
    await waitFor(() => expect(within(roster()).getByText('Manila')).toBeInTheDocument())

    await openImport(user, await xlsxFile(STANDARD, [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Cebu']]))
    expect(within(dialog()).getByText(/1 to update/i)).toBeInTheDocument()
    await user.click(within(dialog()).getByRole('button', { name: /^Import/ }))

    await waitFor(() => expect(within(roster()).getByText('Cebu')).toBeInTheDocument())
    expect(within(roster()).getAllByText('Ana Cruz')).toHaveLength(1)
  })

  test('reports rows it had to skip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(
      user,
      await xlsxFile(STANDARD, [
        ['', 'Nobody At All', '', 'Manila'],
        ['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila'],
      ]),
    )
    expect(within(dialog()).getByText(/1 skipped/i)).toBeInTheDocument()
  })

  test('closing without importing leaves the roster untouched', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(user, await xlsxFile(STANDARD, [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila']]))
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(roster()).queryByText('Ana Cruz')).not.toBeInTheDocument()
  })

  test('explains itself when the file cannot be read as a spreadsheet', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(roster()).getByRole('button', { name: 'Import members' }))
    await user.upload(
      screen.getByLabelText('Excel file'),
      new File(['this is not a spreadsheet'], 'notes.xlsx', { type: 'application/vnd.ms-excel' }),
    )

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(/could not be read/i)
  })

  test('an imported member can be dragged onto a trip like any other', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openImport(user, await xlsxFile(STANDARD, [['ACME\\acruz', 'Ana Cruz', 'Ben Ortiz', 'Manila']]))
    await user.click(within(dialog()).getByRole('button', { name: /^Import/ }))
    await waitFor(() => expect(within(roster()).getByText('Ana Cruz')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Add trip' }))
    await user.type(screen.getByLabelText('Destination'), 'Tokyo')
    await user.click(screen.getByRole('button', { name: 'Save trip' }))

    const card = screen.getByRole('article', { name: 'Tokyo' })
    await user.selectOptions(within(card).getByLabelText('Add member to Tokyo'), 'Ana Cruz')
    expect(within(card).getByRole('listitem', { name: /Ana Cruz/ })).toBeInTheDocument()
  })
})
