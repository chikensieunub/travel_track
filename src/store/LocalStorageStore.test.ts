import { describe, test, expect, beforeEach } from 'vitest'
import { LocalStorageStore, STORAGE_KEY } from './LocalStorageStore'
import { addMember, emptyData } from './operations'

describe('LocalStorageStore', () => {
  beforeEach(() => localStorage.clear())

  test('returns empty data when nothing has been saved yet', () => {
    const result = new LocalStorageStore().load()
    expect(result.data.members).toEqual([])
    expect(result.recovered).toBeUndefined()
  })

  test('round-trips saved data', () => {
    const store = new LocalStorageStore()
    store.save(addMember(emptyData(), { name: 'Ana', team: 'Eng', role: 'Tech' }))
    expect(new LocalStorageStore().load().data.members[0].name).toBe('Ana')
  })

  test('unparseable stored data loads empty and hands back the raw text', () => {
    localStorage.setItem(STORAGE_KEY, '{not json at all')
    const result = new LocalStorageStore().load()
    expect(result.data.members).toEqual([])
    expect(result.recovered).toBe('{not json at all')
  })

  test('stored data of the wrong shape loads empty and hands back the raw text', () => {
    localStorage.setItem(STORAGE_KEY, '{"members":"nope"}')
    const result = new LocalStorageStore().load()
    expect(result.data.members).toEqual([])
    expect(result.recovered).toBe('{"members":"nope"}')
  })

  test('corrupt data is not overwritten by the failed load', () => {
    localStorage.setItem(STORAGE_KEY, '{broken')
    new LocalStorageStore().load()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken')
  })

  test('missing optional collections are filled in rather than rejected', () => {
    localStorage.setItem(STORAGE_KEY, '{"schemaVersion":1,"members":[],"trips":[]}')
    const result = new LocalStorageStore().load()
    expect(result.data.assignments).toEqual([])
    expect(result.recovered).toBeUndefined()
  })
})
