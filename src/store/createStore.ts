import type { TravelData } from './types'
import { LocalStorageStore, type LoadResult, type TravelStore } from './LocalStorageStore'
import { emptyData } from './operations'
import { seedData } from './seed'

/**
 * Holds data only while the page is open.
 *
 * Used when the browser refuses storage, which happens to a file opened straight
 * from disk. The app still works; it just cannot remember anything, and says so.
 */
export class MemoryStore implements TravelStore {
  private data: TravelData = seedData() ?? emptyData()

  load(): LoadResult {
    return { data: this.data, persistent: false }
  }

  save(data: TravelData): void {
    this.data = data
  }
}

/** True when the browser will actually let us keep anything. */
function storageWorks(): boolean {
  try {
    const probe = 'travel-tracker/probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function createStore(): TravelStore {
  return storageWorks() ? new LocalStorageStore() : new MemoryStore()
}
