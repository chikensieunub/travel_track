import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { BUILD_ID } from '../buildId'

describe('The build marker', () => {
  beforeEach(() => localStorage.clear())

  test('shows which build the page is running', () => {
    render(<App />)
    expect(screen.getByTitle('Which build this page is running')).toHaveTextContent(BUILD_ID)
  })

  test('sits beside the title so it is always visible', () => {
    render(<App />)
    const tag = screen.getByTitle('Which build this page is running')
    expect(tag.closest('h1')).toHaveTextContent('Travel Tracker')
  })
})
