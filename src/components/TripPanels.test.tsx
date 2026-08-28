import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

type User = ReturnType<typeof userEvent.setup>

const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (destination: string) => screen.getByRole('article', { name: destination })
const confirmed = (destination = 'Tokyo') => within(card(destination)).getByRole('group', { name: /^Confirmed/ })
const tentative = (destination = 'Tokyo') => within(card(destination)).getByRole('group', { name: /^Tentative/ })

async function addMember(user: User, name: string, boss = 'Ben Ortiz') {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME\\' + name.toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  if (boss) await user.type(screen.getByLabelText('Direct boss'), boss)
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

async function addTrip(user: User, destination: string) {
  await user.click(screen.getByRole('button', { name: 'Add trip' }))
  await user.type(screen.getByLabelText('Destination'), destination)
  await user.click(screen.getByRole('button', { name: 'Save trip' }))
}

const assignTo = (user: User, destination: string, name: string) =>
  user.selectOptions(within(card(destination)).getByLabelText(`Add member to ${destination}`), name)

/** Click a member's name on one card to select them, revealing the move button. */
const selectMember = (user: User, name: string, destination = 'Tokyo') =>
  user.click(within(card(destination)).getByRole('button', { name: `Select ${name}` }))

async function setup(user: User, names: string[] = ['Ana']) {
  render(<App />)
  for (const name of names) await addMember(user, name)
  await addTrip(user, 'Tokyo')
  for (const name of names) await assignTo(user, 'Tokyo', name)
}

describe('Confirmed and tentative panels', () => {
  beforeEach(() => localStorage.clear())

  test('both panels are always shown, so either can be dropped into', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTrip(user, 'Tokyo')
    expect(confirmed()).toBeInTheDocument()
    expect(tentative()).toBeInTheDocument()
  })

  test('a newly added member lands in confirmed', async () => {
    const user = userEvent.setup()
    await setup(user)
    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
    expect(within(tentative()).queryByText('Ana')).not.toBeInTheDocument()
  })

  test('each panel shows its own count', async () => {
    const user = userEvent.setup()
    await setup(user, ['Ana', 'Chen'])
    expect(within(card('Tokyo')).getByRole('group', { name: 'Confirmed, 2 members' })).toBeInTheDocument()
    expect(within(card('Tokyo')).getByRole('group', { name: 'Tentative, 0 members' })).toBeInTheDocument()
  })

  test('each panel groups its people by direct boss', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Dia', 'Eve Marsh')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Tokyo', 'Dia')

    expect(within(confirmed()).getByRole('group', { name: /^Ben Ortiz/ })).toBeInTheDocument()
    expect(within(confirmed()).getByRole('group', { name: /^Eve Marsh/ })).toBeInTheDocument()
  })
})

describe('Moving between panels', () => {
  beforeEach(() => localStorage.clear())

  test('no move button is shown until a member is selected', async () => {
    const user = userEvent.setup()
    await setup(user)
    expect(within(card('Tokyo')).queryByRole('button', { name: /Move down/ })).not.toBeInTheDocument()
  })

  test('clicking a name reveals the move button', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    expect(within(card('Tokyo')).getByRole('button', { name: /Move down/ })).toBeInTheDocument()
  })

  test('moving down puts the member in tentative', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))

    expect(within(tentative()).getByText('Ana')).toBeInTheDocument()
    expect(within(confirmed()).queryByText('Ana')).not.toBeInTheDocument()
  })

  test('a tentative member offers move up instead of move down', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))
    await selectMember(user, 'Ana')

    expect(within(card('Tokyo')).getByRole('button', { name: /Move up/ })).toBeInTheDocument()
    expect(within(card('Tokyo')).queryByRole('button', { name: /Move down/ })).not.toBeInTheDocument()
  })

  test('moving up returns the member to confirmed', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move up/ }))

    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
  })

  test('the selection clears once the member has moved', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))

    expect(within(card('Tokyo')).queryByRole('button', { name: /Move (up|down)/ })).not.toBeInTheDocument()
  })

  test('clicking the selected member again deselects them', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    await selectMember(user, 'Ana')
    expect(within(card('Tokyo')).queryByRole('button', { name: /Move down/ })).not.toBeInTheDocument()
  })

  test('selecting a different member moves the button to them', async () => {
    const user = userEvent.setup()
    await setup(user, ['Ana', 'Chen'])
    await selectMember(user, 'Ana')
    await selectMember(user, 'Chen')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))

    expect(within(tentative()).getByText('Chen')).toBeInTheDocument()
    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
  })

  test('only one member is ever selected, so only one move button shows', async () => {
    const user = userEvent.setup()
    await setup(user, ['Ana', 'Chen'])
    await selectMember(user, 'Ana')
    await selectMember(user, 'Chen')
    expect(within(card('Tokyo')).getAllByRole('button', { name: /Move (up|down)/ })).toHaveLength(1)
  })

  test('a member selected on one trip does not arm the button on another', async () => {
    const user = userEvent.setup()
    await setup(user)
    await addTrip(user, 'Berlin')
    await assignTo(user, 'Berlin', 'Ana')
    await selectMember(user, 'Ana')

    // The same person is on both trips; only the card clicked in should be armed.
    expect(within(card('Tokyo')).getAllByRole('button', { name: /Move down/ })).toHaveLength(1)
    expect(within(card('Berlin')).queryByRole('button', { name: /Move down/ })).not.toBeInTheDocument()
  })

  test('removing a member still works while they are selected', async () => {
    const user = userEvent.setup()
    await setup(user)
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: 'Remove Ana from Tokyo' }))
    // Gone from both panels; she reappears in the add-member menu, which is expected.
    expect(within(confirmed()).queryByRole('button', { name: 'Select Ana' })).not.toBeInTheDocument()
    expect(within(tentative()).queryByRole('button', { name: 'Select Ana' })).not.toBeInTheDocument()
  })

  test('the headcount counts both panels together', async () => {
    const user = userEvent.setup()
    await setup(user, ['Ana', 'Chen'])
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))

    expect(within(card('Tokyo')).getByText('2 members')).toBeInTheDocument()
  })

  test('a move survives a reload', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await addMember(user, 'Ana')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))
    first.unmount()

    render(<App />)
    expect(within(tentative()).getByText('Ana')).toBeInTheDocument()
  })
})

describe('Colours across the two panels', () => {
  beforeEach(() => localStorage.clear())

  const slotOf = (panel: HTMLElement, boss: string) =>
    within(panel).getByRole('group', { name: new RegExp(`^${boss}`) }).getAttribute('data-boss-slot')

  test('a boss looks the same in confirmed and tentative on one card', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Chen', 'Ben Ortiz')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Tokyo', 'Chen')
    await selectMember(user, 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: /Move down/ }))

    expect(slotOf(confirmed(), 'Ben Ortiz')).toBe(slotOf(tentative(), 'Ben Ortiz'))
  })

  test('no team on a card is left without a colour', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (let i = 0; i < 10; i += 1) await addMember(user, `P${i}`, `Boss${String(i).padStart(2, '0')}`)
    await addTrip(user, 'Tokyo')
    for (let i = 0; i < 10; i += 1) await assignTo(user, 'Tokyo', `P${i}`)

    const columns = within(confirmed()).getAllByRole('group')
    const slots = columns.map((c) => Number(c.getAttribute('data-boss-slot')))
    expect(slots).toHaveLength(10)
    expect(slots.every((s) => s >= 0)).toBe(true)
  }, 30000)

  test('two teams on the same card never share a colour', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (let i = 0; i < 8; i += 1) await addMember(user, `P${i}`, `Boss${String(i).padStart(2, '0')}`)
    await addTrip(user, 'Tokyo')
    for (let i = 0; i < 8; i += 1) await assignTo(user, 'Tokyo', `P${i}`)

    const slots = within(confirmed())
      .getAllByRole('group')
      .map((c) => c.getAttribute('data-boss-slot'))
    expect(new Set(slots).size).toBe(slots.length)
  }, 30000)
})
