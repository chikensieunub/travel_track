import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const TODAY = new Date('2026-08-25T12:00:00Z')

const upcoming = () => screen.getByRole('region', { name: 'Upcoming trips' })
const past = () => screen.getByRole('region', { name: 'Past trips' })
const roster = () => screen.getByRole('region', { name: 'Members' })

async function addMember(user: ReturnType<typeof userEvent.setup>, name: string, location = 'Manila') {
  await user.click(within(roster()).getByRole('button', { name: 'Add member' }))
  await user.type(screen.getByLabelText('Domain name'), 'ACME\\' + name.toLowerCase())
  await user.type(screen.getByLabelText('Full name'), name)
  await user.type(screen.getByLabelText('Location'), location)
  await user.click(screen.getByRole('button', { name: 'Save member' }))
}

async function addTrip(
  user: ReturnType<typeof userEvent.setup>,
  destination: string,
  startDate: string,
  durationDays: number,
) {
  await user.click(screen.getByRole('button', { name: 'Add trip' }))
  await user.type(screen.getByLabelText('Destination'), destination)
  await user.clear(screen.getByLabelText('Start date'))
  await user.type(screen.getByLabelText('Start date'), startDate)
  await user.clear(screen.getByLabelText('Duration (days)'))
  await user.type(screen.getByLabelText('Duration (days)'), String(durationDays))
  await user.click(screen.getByRole('button', { name: 'Save trip' }))
}

const tripCard = (destination: string) => screen.getByRole('article', { name: destination })

describe('Travel Tracker', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(TODAY)
  })
  afterEach(() => vi.useRealTimers())

  test('a new member appears in the roster', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    expect(within(roster()).getByText('Ana')).toBeInTheDocument()
  })

  test('a trip in the future appears under upcoming trips', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    expect(within(upcoming()).getByRole('article', { name: 'Tokyo' })).toBeInTheDocument()
  })

  test('a trip whose last day has passed appears under past trips', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTrip(user, 'Lisbon', '2026-01-05', 3)
    expect(within(past()).getByRole('article', { name: 'Lisbon' })).toBeInTheDocument()
  })

  test('the trip card shows its date range and duration', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    expect(within(tripCard('Tokyo')).getByText('5 Oct 2026 → 11 Oct 2026 · 7 days')).toBeInTheDocument()
  })

  test('a member added to a trip is listed on that trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    await user.selectOptions(within(tripCard('Tokyo')).getByLabelText('Add member to Tokyo'), 'Ana')
    expect(within(tripCard('Tokyo')).getByRole('listitem', { name: /Ana/ })).toBeInTheDocument()
  })

  test('removing a member from a trip takes them off that trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    await user.selectOptions(within(tripCard('Tokyo')).getByLabelText('Add member to Tokyo'), 'Ana')
    await user.click(within(tripCard('Tokyo')).getByRole('button', { name: 'Remove Ana from Tokyo' }))
    expect(within(tripCard('Tokyo')).queryByRole('listitem', { name: /Ana/ })).not.toBeInTheDocument()
  })

  test('adding a member to a trip that clashes with their existing trip warns which trip clashes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await addTrip(user, 'Tokyo', '2026-10-05', 7) // Oct 5-11
    await addTrip(user, 'Berlin', '2026-10-10', 4) // Oct 10-13, clashes on Oct 10-11
    await user.selectOptions(within(tripCard('Tokyo')).getByLabelText('Add member to Tokyo'), 'Ana')
    await user.selectOptions(within(tripCard('Berlin')).getByLabelText('Add member to Berlin'), 'Ana')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/Ana/)
    expect(alert).toHaveTextContent(/Tokyo/)
    // The clash is a warning, not a block - Ana is still on Berlin.
    expect(within(tripCard('Berlin')).getByRole('listitem', { name: /Ana/ })).toBeInTheDocument()
  })

  test('a member on two trips that do not clash raises no warning', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana')
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    await addTrip(user, 'Berlin', '2026-12-01', 4)
    await user.selectOptions(within(tripCard('Tokyo')).getByLabelText('Add member to Tokyo'), 'Ana')
    await user.selectOptions(within(tripCard('Berlin')).getByLabelText('Add member to Berlin'), 'Ana')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('searching the roster narrows it to matching members', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Manila')
    await addMember(user, 'Ben', 'Berlin')
    await user.type(within(roster()).getByLabelText('Search members'), 'ana')
    expect(within(roster()).getByText('Ana')).toBeInTheDocument()
    expect(within(roster()).queryByText('Ben')).not.toBeInTheDocument()
  })

  test('the roster can be searched by location as well as by name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Manila')
    await addMember(user, 'Ben', 'Berlin')
    await user.type(within(roster()).getByLabelText('Search members'), 'berlin')
    expect(within(roster()).getByText('Ben')).toBeInTheDocument()
    expect(within(roster()).queryByText('Ana')).not.toBeInTheDocument()
  })

  test('the roster can be searched by domain name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addMember(user, 'Ana', 'Manila')
    await addMember(user, 'Ben', 'Berlin')
    await user.type(within(roster()).getByLabelText('Search members'), 'acme\\ben')
    expect(within(roster()).getByText('Ben')).toBeInTheDocument()
    expect(within(roster()).queryByText('Ana')).not.toBeInTheDocument()
  })

  test('filtering trips narrows the board to matching destinations', async () => {
    const user = userEvent.setup()
    render(<App />)
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    await addTrip(user, 'Berlin', '2026-12-01', 4)
    await user.type(screen.getByLabelText('Filter trips'), 'tok')
    expect(screen.getByRole('article', { name: 'Tokyo' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Berlin' })).not.toBeInTheDocument()
  })

  test('members and trips survive a reload', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await addMember(user, 'Ana')
    await addTrip(user, 'Tokyo', '2026-10-05', 7)
    first.unmount()

    render(<App />)
    expect(within(roster()).getByText('Ana')).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Tokyo' })).toBeInTheDocument()
  })
})
