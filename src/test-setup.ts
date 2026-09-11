import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// A standalone build bakes a real board into seedData.json, and that file is not
// committed. Tests must not depend on whatever happens to be sitting there, so
// the app always starts empty here; seedFrom is tested directly instead.
vi.mock('./store/seed', () => ({
  seedData: () => null,
  seedFrom: (value: unknown) => value,
}))
