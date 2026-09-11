import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createStore, MemoryStore } from './createStore'
import { LocalStorageStore, STORAGE_KEY } from './LocalStorageStore'
import { addMember, emptyData } from './operations'

describe('createStore', () => {
  beforeEach(() => localStorage.clear())

  test('uses browser storage when it works', () => {
    expect(createStore()).toBeInstanceOf(LocalStorageStore)
  })

  test('falls back to memory when browser storage is barred', () => {
    // Opening the app from a file:// path can make localStorage throw.
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(createStore()).toBeInstanceOf(MemoryStore)
    spy.mockRestore()
  })

  test('leaves no trace behind when testing whether storage works', () => {
    createStore()
    expect(localStorage.length).toBe(0)
  })
})

describe('MemoryStore', () => {
  test('says plainly that it cannot keep anything', () => {
    expect(new MemoryStore().load().persistent).toBe(false)
  })

  test('still holds data for as long as the page is open', () => {
    const store = new MemoryStore()
    store.save(addMember(emptyData(), { domainName: 'A', fullName: 'Ana' }))
    expect(store.load().data.members).toHaveLength(1)
  })

  test('starts empty', () => {
    expect(new MemoryStore().load().data.members).toEqual([])
  })
})

describe('LocalStorageStore reports that it persists', () => {
  beforeEach(() => localStorage.clear())

  test('says so', () => {
    expect(new LocalStorageStore().load().persistent).toBe(true)
  })

  test('still round-trips', () => {
    const store = new LocalStorageStore()
    store.save(addMember(emptyData(), { domainName: 'A', fullName: 'Ana' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()
  })
})
