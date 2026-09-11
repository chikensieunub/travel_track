import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { BOSS_NAME } from '../store/boss'

type User = ReturnType<typeof userEvent.setup>

const roster = () => screen.getByRole('region', { name: 'Members' })
const card = (d = 'Tokyo') => screen.getByRole('article', { name: d })
const bossPanel = () => within(card()).getByRole('group', { name: /^Boss/ })
const confirmed = () => within(card()).getByRole('group', { name: /^Confirmed/ })
const tentative = () => within(card()).getByRole('group', { name: /^Tentative/ })

async function addMember(user: User, name: string, boss = 'MINHND', stillHere = true) {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME-' + name.slice(0, 6).toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  if (boss) await user.type(screen.getByLabelText('Direct boss'), boss)
  if (!stillHere) await user.click(screen.getByLabelText('Currently on the team'))
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

async function setup(user: User, names: string[]) {
  render(<App />)
  for (const name of names) await addMember(user, name)
  await user.click(screen.getByRole('button', { name: 'Add trip' }))
  await user.type(screen.getByLabelText('Destination'), 'Tokyo')
  await user.click(screen.getByRole('button', { name: 'Save trip' }))
  for (const name of names) {
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), name)
  }
}

describe('The boss panel', () => {
  beforeEach(() => localStorage.clear())

  test('is not shown when the boss is not on the trip', async () => {
    const user = userEvent.setup()
    await setup(user, ['Ana'])
    expect(within(card()).queryByRole('group', { name: /^Boss/ })).not.toBeInTheDocument()
  })

  test('appears when the boss is on the trip', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME])
    expect(within(bossPanel()).getByText(BOSS_NAME)).toBeInTheDocument()
  })

  test('takes the boss out of the confirmed list', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME, 'Ana'])
    expect(within(confirmed()).queryByText(BOSS_NAME)).not.toBeInTheDocument()
    expect(within(confirmed()).getByText('Ana')).toBeInTheDocument()
  })

  test('shows whether the boss is confirmed', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME])
    expect(within(bossPanel()).getByText('Confirmed')).toBeInTheDocument()
  })

  test('the boss can still be moved down to tentative', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME])
    await user.click(within(bossPanel()).getByRole('button', { name: `Select ${BOSS_NAME}` }))
    await user.click(within(card()).getByRole('button', { name: /Move down/ }))

    expect(within(bossPanel()).getByText('Tentative')).toBeInTheDocument()
    expect(within(bossPanel()).getByText(BOSS_NAME)).toBeInTheDocument()
  })

  test('a tentative boss stays in the boss panel, not the tentative list', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME])
    await user.click(within(bossPanel()).getByRole('button', { name: `Select ${BOSS_NAME}` }))
    await user.click(within(card()).getByRole('button', { name: /Move down/ }))

    expect(within(tentative()).queryByText(BOSS_NAME)).not.toBeInTheDocument()
  })

  test('the boss is still counted in the headcount', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME, 'Ana'])
    expect(within(card()).getByText('2 members')).toBeInTheDocument()
  })

  test('the boss can be taken off the trip', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME])
    await user.click(within(card()).getByRole('button', { name: `Remove ${BOSS_NAME} from Tokyo` }))
    expect(within(card()).queryByRole('group', { name: /^Boss/ })).not.toBeInTheDocument()
  })

  test('the boss does not count towards his own team coverage', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME, 'Ana'])
    // Both report to MINHND, but only Ana is in the confirmed column.
    const column = within(confirmed()).getByRole('group', { name: /^MINHND/ })
    expect(within(column).getByText('Ana')).toBeInTheDocument()
    expect(within(column).queryByText(BOSS_NAME)).not.toBeInTheDocument()
  })

  test('a boss who has left shows in the left panel rather than the boss panel', async () => {
    const user = userEvent.setup()
    await setup(user, [BOSS_NAME])
    await user.click(within(roster()).getByRole('button', { name: `Edit ${BOSS_NAME}` }))
    await user.click(screen.getByLabelText('Currently on the team'))
    await user.click(screen.getByRole('button', { name: 'Save member' }))

    const gone = within(card()).getByRole('group', { name: /^Left the company/ })
    expect(within(gone).getByText(BOSS_NAME)).toBeInTheDocument()
    expect(within(card()).queryByRole('group', { name: /^Boss/ })).not.toBeInTheDocument()
  })
})

describe('The boss has nobody above him', () => {
  beforeEach(() => localStorage.clear())

  /** He reports to no one, so his direct boss is blank - the real situation. */
  async function setupBossWithNoBoss(user: User, others: string[] = []) {
    render(<App />)
    await addMember(user, BOSS_NAME, '')
    for (const name of others) await addMember(user, name, 'MINHND')
    await user.click(screen.getByRole('button', { name: 'Add trip' }))
    await user.type(screen.getByLabelText('Destination'), 'Tokyo')
    await user.click(screen.getByRole('button', { name: 'Save trip' }))
    await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), BOSS_NAME)
    for (const name of others) {
      await user.selectOptions(within(card()).getByLabelText('Add member to Tokyo'), name)
    }
  }

  test('still gets the boss panel when he reports to nobody', async () => {
    const user = userEvent.setup()
    await setupBossWithNoBoss(user)
    expect(within(bossPanel()).getByText(BOSS_NAME)).toBeInTheDocument()
  })

  test('does not fall into the "no boss recorded" column', async () => {
    const user = userEvent.setup()
    await setupBossWithNoBoss(user, ['Ana'])
    expect(within(card()).queryByRole('group', { name: /No boss recorded/ })).not.toBeInTheDocument()
  })

  test('leaves the other teams alone', async () => {
    const user = userEvent.setup()
    await setupBossWithNoBoss(user, ['Ana'])
    const column = within(confirmed()).getByRole('group', { name: /^MINHND/ })
    expect(within(column).getByText('Ana')).toBeInTheDocument()
  })

  test('is marked as the boss in the member list too', async () => {
    const user = userEvent.setup()
    await setupBossWithNoBoss(user)
    const entry = within(roster()).getByText(BOSS_NAME).closest('li')!
    expect(within(entry).getByText('Boss')).toBeInTheDocument()
  })
})
