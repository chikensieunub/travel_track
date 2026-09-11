import type { TravelData } from './types'
import { migrate } from './migrate'
// Resolved at build time. seedData.json is not committed - it holds real people -
// so a fresh clone gets the empty example copied into place by the Vite config.
import raw from './seedData.json'

/** Whether a backup actually carries anything worth starting from. */
export function seedFrom(value: unknown): TravelData | null {
  const data = (value ?? {}) as Partial<TravelData>
  const hasSomething = (data.members?.length ?? 0) > 0 || (data.trips?.length ?? 0) > 0
  return hasSomething ? migrate(data) : null
}

/**
 * Data a standalone copy of the app starts with.
 *
 * To bake in a real board, press Back up and save the downloaded file over
 * src/store/seedData.json, then build the standalone file.
 */
export function seedData(): TravelData | null {
  return seedFrom(raw)
}
