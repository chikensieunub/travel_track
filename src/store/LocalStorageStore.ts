import type { TravelData } from './types'
import { emptyData } from './operations'
import { migrate } from './migrate'

export const STORAGE_KEY = 'travel-tracker/v1'

export interface LoadResult {
  data: TravelData
  /** Raw text of stored data we could not read, so the user can rescue it instead of losing it. */
  recovered?: string
}

/** Persistence contract. Swap in an API-backed implementation to share data across a team. */
export interface TravelStore {
  load(): LoadResult
  save(data: TravelData): void
}

function isRecordArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((v) => typeof v === 'object' && v !== null)
}

export class LocalStorageStore implements TravelStore {
  load(): LoadResult {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { data: emptyData() }
    try {
      const parsed = JSON.parse(raw) as Partial<TravelData>
      if (typeof parsed !== 'object' || parsed === null) throw new Error('not an object')
      for (const key of ['members', 'trips', 'assignments'] as const) {
        if (parsed[key] !== undefined && !isRecordArray(parsed[key])) throw new Error(`bad ${key}`)
      }
      // Older stored shapes are brought forward rather than rejected.
      return { data: migrate(parsed) }
    } catch {
      // Leave the bad value in place - overwriting it would destroy the only copy.
      return { data: emptyData(), recovered: raw }
    }
  }

  save(data: TravelData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}
