import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import App from '../App'
import { StoreProvider } from '../store/StoreProvider'
import { Board } from './Board'
import { MemoryStore } from '../store/createStore'

describe('When the browser will not let us save', () => {
  beforeEach(() => localStorage.clear())

  const renderWithoutStorage = () =>
    render(
      <StoreProvider store={new MemoryStore()}>
        <Board />
      </StoreProvider>,
    )

  test('says so, rather than pretending to save', () => {
    renderWithoutStorage()
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot be saved/i)
  })

  test('tells the reader what to do about it', () => {
    renderWithoutStorage()
    expect(screen.getByRole('alert')).toHaveTextContent(/back up/i)
  })

  test('the warning cannot be dismissed, since the problem does not go away', () => {
    renderWithoutStorage()
    const alert = screen.getByRole('alert')
    expect(within(alert).queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
  })

  test('stays out of the way when storage works normally', () => {
    render(<App />)
    expect(screen.queryByText(/cannot be saved/i)).not.toBeInTheDocument()
  })
})
