import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

type User = ReturnType<typeof userEvent.setup>

const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (d = 'Tokyo') => screen.getByRole('article', { name: d })
const panel = (name: RegExp) => within(card()).getByRole('group', { name })
const confirmed = () => panel(/^Confirmed/)
const gone = () => panel(/^Left the company/)

async function addMember(user: User, name: string, boss = 'Ben Ortiz', stillHere = true) {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME-' + name.toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  if (boss) await user.type(screen.getByLabelText('Direct boss'), boss)
  if (!stillHere) await user.click(screen.getByLabelText('Currently on the team'))
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

async function setup(user: User) {
  render(<App />)
  await addMember(user, 'Ana')
  await user.click(screen.getByRole('button', { name: 'Add trip' }))
  await user.type(screen.getByLabelText('Destination'), 'Tokyo')
  await user.click(screen.getByRole('button', { name: 'Save trip' }))
  await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), 'Ana')
}

describe('The left-the-company panel', () => {
  beforeEach(() => localStorage.clear())

  test('is not shown when nobody on the trip has left', async () => {
    const user = userEvent.setup()
    await setup(user)
    expect(within(card()).queryByRole('group', { name: /^Left the company/ })).not.toBeInTheDocument()
  })

  test('appears once someone on the trip is marked as having left', async () => {
    const user = userEvent.setup()
    await setup(user)
    await user.click(within(roster()).getByRole('button', { name: 'Edit Ana' }))
    await user.click(screen.getByLabelText('Currently on the team'))
    await user.click(screen.getByRole('button', { name: 'Save member' }))

    expect(within(gone()).getByText('Ana')).toBeInTheDocument()
  })

  test('takes them out of confirmed once they have left', async () => {
    const user = userEvent.setup()
    await setup(user)
    await user.click(within(roster()).getByRole('button', { name: 'Edit Ana' }))
    await user.click(screen.getByLabelText('Currently on the team'))
    await user.click(screen.getByRole('button', { name: 'Save member' }))

    expect(within(confirmed()).queryByText('Ana')).not.toBeInTheDocument()
  })

  test('groups leavers by their boss, like the other panels', async () => {
    const user = userEvent.setup()
    await setup(user)
    await user.click(within(roster()).getByRole('button', { name: 'Edit Ana' }))
    await user.click(screen.getByLabelText('Currently on the team'))
    await user.click(screen.getByRole('button', { name: 'Save member' }))

    expect(within(gone()).getByRole('group', { name: /^Ben Ortiz/ })).toBeInTheDocument()
  })

  test('still counts them in the trip headcount', async () => {
    const user = userEvent.setup()
    await setup(user)
    await user.click(within(roster()).getByRole('button', { name: 'Edit Ana' }))
    await user.click(screen.getByLabelText('Currently on the team'))
    await user.click(screen.getByRole('button', { name: 'Save member' }))

    expect(within(card()).getByText('1 member')).toBeInTheDocument()
  })

  test('bringing someone back returns them to confirmed', async () => {
    const user = userEvent.setup()
    await setup(user)
    for (let i = 0; i < 2; i += 1) {
      await user.click(within(roster()).getByRole('button', { name: 'Edit Ana' }))
      await user.click(screen.getByLabelText('Currently on the team'))
      await user.click(screen.getByRole('button', { name: 'Save member' }))
    }
    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
    expect(within(card()).queryByRole('group', { name: /^Left the company/ })).not.toBeInTheDocument()
  })
})

describe('People with no boss recorded', () => {
  beforeEach(() => localStorage.clear())

  async function tripWithBosslessPerson(user: User) {
    render(<App />)
    await addMember(user, 'Ana', '')
    await user.click(screen.getByRole('button', { name: 'Add trip' }))
    await user.type(screen.getByLabelText('Destination'), 'Tokyo')
    await user.click(screen.getByRole('button', { name: 'Save trip' }))
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), 'Ana')
  }

  test('are listed without a "no boss recorded" heading', async () => {
    const user = userEvent.setup()
    await tripWithBosslessPerson(user)
    expect(within(card()).queryByText('No boss recorded')).not.toBeInTheDocument()
  })

  test('are still shown on the trip', async () => {
    const user = userEvent.setup()
    await tripWithBosslessPerson(user)
    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
  })

  test('carry no team ratio, since they are not a team', async () => {
    const user = userEvent.setup()
    await tripWithBosslessPerson(user)
    expect(within(confirmed()).queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument()
  })

  test('do not disturb a real team column beside them', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', '')
    await addMember(user, 'Dia', 'Ben Ortiz')
    await user.click(screen.getByRole('button', { name: 'Add trip' }))
    await user.type(screen.getByLabelText('Destination'), 'Tokyo')
    await user.click(screen.getByRole('button', { name: 'Save trip' }))
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), 'Ana')
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), 'Dia')

    const team = within(confirmed()).getByRole('group', { name: /^Ben Ortiz/ })
    expect(within(team).getByText('Dia')).toBeInTheDocument()
    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
  })
})
