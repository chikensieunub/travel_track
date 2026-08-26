import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StoreProvider } from './StoreProvider'
import { useStore } from './context'
import { STORAGE_KEY } from './LocalStorageStore'

function Probe() {
  const store = useStore()
  return (
    <div>
      <span data-testid="count">{store.data.members.length}</span>
      <span data-testid="recovered">{store.recovered ?? 'none'}</span>
      <button onClick={() => store.addMember({ domainName: 'ACME\\acruz', fullName: 'Ana' })}>add</button>
    </div>
  )
}

const renderProbe = () => render(<StoreProvider><Probe /></StoreProvider>)

describe('StoreProvider', () => {
  beforeEach(() => localStorage.clear())

  test('starts from whatever was previously stored', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2, members: [{ id: 'm1', domainName: 'ACME\\bortiz', fullName: 'Ben', directBoss: '', location: '', active: true }], trips: [], assignments: [] }),
    )
    renderProbe()
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  test('a change is written straight back to storage', () => {
    renderProbe()
    act(() => { screen.getByText('add').click() })
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).members[0].fullName).toBe('Ana')
  })

  test('surfaces unreadable stored data instead of hiding it', () => {
    localStorage.setItem(STORAGE_KEY, '{corrupt')
    renderProbe()
    expect(screen.getByTestId('recovered')).toHaveTextContent('{corrupt')
  })
})
