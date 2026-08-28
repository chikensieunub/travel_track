import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

type User = ReturnType<typeof userEvent.setup>

const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (d = 'Tokyo') => screen.getByRole('article', { name: d })
const confirmedPanel = () => within(card()).getByRole('group', { name: /^Confirmed/ })
const tentativePanel = () => within(card()).getByRole('group', { name: /^Tentative/ })

async function addMember(user: User, name: string, boss = 'Ben Ortiz') {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME\\' + name.toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  if (boss) await user.type(screen.getByLabelText('Direct boss'), boss)
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

const assignTo = (user: User, name: string) =>
  user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), name)

async function setup(user: User, roster: [string, string][], onTrip: string[]) {
  render(<App />)
  for (const [name, boss] of roster) await addMember(user, name, boss)
  await user.click(screen.getByRole('button', { name: 'Add trip' }))
  await user.type(screen.getByLabelText('Destination'), 'Tokyo')
  await user.click(screen.getByRole('button', { name: 'Save trip' }))
  for (const name of onTrip) await assignTo(user, name)
}

const BEN_TEAM: [string, string][] = [
  ['Ana', 'Ben Ortiz'],
  ['Chen', 'Ben Ortiz'],
  ['Dia', 'Ben Ortiz'],
]

describe('Team coverage in the confirmed panel', () => {
  beforeEach(() => localStorage.clear())

  test('shows confirmed out of the whole team', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen'])
    expect(within(confirmedPanel()).getByText('2/3')).toBeInTheDocument()
  })

  test('shows the percentage of the team confirmed', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen'])
    expect(within(confirmedPanel()).getByText('67%')).toBeInTheDocument()
  })

  test('a whole team going reads as 100%', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen', 'Dia'])
    expect(within(confirmedPanel()).getByText('3/3')).toBeInTheDocument()
    expect(within(confirmedPanel()).getByText('100%')).toBeInTheDocument()
  })

  test('counts the whole team, not just the people on the trip', async () => {
    const user = userEvent.setup()
    // Six under Ben, only one going.
    await setup(
      user,
      ['Ana', 'Chen', 'Dia', 'Eve', 'Fay', 'Gil'].map((n) => [n, 'Ben Ortiz'] as [string, string]),
      ['Ana'],
    )
    expect(within(confirmedPanel()).getByText('1/6')).toBeInTheDocument()
    expect(within(confirmedPanel()).getByText('17%')).toBeInTheDocument()
  })

  test('reads the ratio out for screen readers', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen'])
    expect(
      within(confirmedPanel()).getByRole('group', { name: 'Ben Ortiz, 2 of 3 confirmed, 67%' }),
    ).toBeInTheDocument()
  })

  test('coverage drops when someone is moved down to tentative', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen'])
    await user.click(within(card()).getByRole('button', { name: 'Select Ana' }))
    await user.click(within(card()).getByRole('button', { name: /Move down/ }))

    expect(within(confirmedPanel()).getByText('1/3')).toBeInTheDocument()
    expect(within(confirmedPanel()).getByText('33%')).toBeInTheDocument()
  })

  test('the tentative panel keeps a plain count, with no ratio', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen'])
    await user.click(within(card()).getByRole('button', { name: 'Select Ana' }))
    await user.click(within(card()).getByRole('button', { name: /Move down/ }))

    expect(within(tentativePanel()).queryByText(/\d+%/)).not.toBeInTheDocument()
    expect(within(tentativePanel()).getByRole('group', { name: 'Ben Ortiz, 1 member' })).toBeInTheDocument()
  })

  test('each boss column measures against its own team', async () => {
    const user = userEvent.setup()
    await setup(
      user,
      [
        ['Ana', 'Ben Ortiz'],
        ['Chen', 'Ben Ortiz'],
        ['Dia', 'Eve Marsh'],
      ],
      ['Ana', 'Dia'],
    )
    const ben = within(confirmedPanel()).getByRole('group', { name: /^Ben Ortiz/ })
    const eve = within(confirmedPanel()).getByRole('group', { name: /^Eve Marsh/ })
    expect(within(ben).getByText('1/2')).toBeInTheDocument()
    expect(within(eve).getByText('1/1')).toBeInTheDocument()
  })

  test('draws a meter showing the same proportion', async () => {
    const user = userEvent.setup()
    await setup(user, BEN_TEAM, ['Ana', 'Chen'])
    const meter = within(confirmedPanel()).getByTestId('coverage-meter')
    expect(meter).toHaveAttribute('data-percent', '67')
  })
})
