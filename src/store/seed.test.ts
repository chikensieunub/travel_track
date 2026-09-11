import { describe, test, expect, beforeEach } from 'vitest'
import { LocalStorageStore, STORAGE_KEY } from './LocalStorageStore'
import { seedData } from './seed'

describe('seed data', () => {
  beforeEach(() => localStorage.clear())

  test('is empty unless someone has baked a backup in', () => {
    // The committed seed file is empty; a standalone build replaces it.
    expect(seedData()).toBeNull()
  })

  test('an empty seed leaves a fresh app empty', () => {
    expect(new LocalStorageStore().load().data.members).toEqual([])
  })

  test('stored data always wins over the seed', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 3, members: [], trips: [], assignments: [] }),
    )
    expect(new LocalStorageStore().load().data.members).toEqual([])
  })
})
