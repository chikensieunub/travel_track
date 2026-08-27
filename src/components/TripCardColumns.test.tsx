import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

type User = ReturnType<typeof userEvent.setup>

const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (destination: string) => screen.getByRole('article', { name: destination })

async function addMember(user: User, name: string, boss: string) {
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

/** The colour slot a boss column is painted with, as rendered. */
const slotOf = (destination: string, boss: string): string | null =>
  within(card(destination))
    .getByRole('group', { name: new RegExp(`^${boss}`) })
    .getAttribute('data-boss-slot')

describe('Trip card member columns', () => {
  beforeEach(() => localStorage.clear())

  test('shows the total number of members on the trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Chen', 'Ben Ortiz')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Tokyo', 'Chen')

    expect(within(card('Tokyo')).getByText('2 members')).toBeInTheDocument()
  })

  test('says "1 member" rather than "1 members"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')

    expect(within(card('Tokyo')).getByText('1 member')).toBeInTheDocument()
  })

  test('groups members into a column per direct boss', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Chen', 'Ben Ortiz')
    await addMember(user, 'Dia', 'Eve Marsh')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Tokyo', 'Chen')
    await assignTo(user, 'Tokyo', 'Dia')

    const benColumn = within(card('Tokyo')).getByRole('group', { name: /^Ben Ortiz/ })
    expect(within(benColumn).getByText('Ana')).toBeInTheDocument()
    expect(within(benColumn).getByText('Chen')).toBeInTheDocument()
    expect(within(benColumn).queryByText('Dia')).not.toBeInTheDocument()

    const eveColumn = within(card('Tokyo')).getByRole('group', { name: /^Eve Marsh/ })
    expect(within(eveColumn).getByText('Dia')).toBeInTheDocument()
  })

  test('each column shows its own count', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Chen', 'Ben Ortiz')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Tokyo', 'Chen')

    expect(within(card('Tokyo')).getByRole('group', { name: 'Ben Ortiz, 2 members' })).toBeInTheDocument()
  })

  test('names the boss on the column, so colour is never the only signal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')

    expect(within(card('Tokyo')).getByText('Ben Ortiz')).toBeInTheDocument()
  })

  test('members with no boss recorded get their own column', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', '')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')

    const column = within(card('Tokyo')).getByRole('group', { name: /No boss recorded/ })
    expect(within(column).getByText('Ana')).toBeInTheDocument()
  })

  test('a boss wears the same colour on every trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Dia', 'Eve Marsh')
    await addTrip(user, 'Tokyo')
    await addTrip(user, 'Berlin')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Berlin', 'Ana')
    await assignTo(user, 'Berlin', 'Dia')

    expect(slotOf('Tokyo', 'Ben Ortiz')).toBe(slotOf('Berlin', 'Ben Ortiz'))
  })

  test('different bosses get different colours', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addMember(user, 'Dia', 'Eve Marsh')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await assignTo(user, 'Tokyo', 'Dia')

    expect(slotOf('Tokyo', 'Ben Ortiz')).not.toBe(slotOf('Tokyo', 'Eve Marsh'))
  })

  test('members can still be removed from a trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Ben Ortiz')
    await addTrip(user, 'Tokyo')
    await assignTo(user, 'Tokyo', 'Ana')
    await user.click(within(card('Tokyo')).getByRole('button', { name: 'Remove Ana from Tokyo' }))

    expect(within(card('Tokyo')).queryByRole('group', { name: /Ben Ortiz/ })).not.toBeInTheDocument()
    expect(within(card('Tokyo')).queryByText('1 member')).not.toBeInTheDocument()
  })

  test('a trip with nobody on it shows no member count', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTrip(user, 'Tokyo')

    expect(within(card('Tokyo')).queryByText(/^\d+ members?$/)).not.toBeInTheDocument()
  })
})
