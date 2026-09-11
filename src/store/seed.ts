import type { TravelData } from './types'
import { migrate } from './migrate'
import raw from './seedData.json'

/**
 * Data a standalone copy of the app starts with.
 *
 * Empty in the repository. To bake in a real board, press Back up and save the
 * downloaded file over src/store/seedData.json, then build the standalone file.
 */
export function seedData(): TravelData | null {
  const data = raw as Partial<TravelData>
  const hasSomething = (data.members?.length ?? 0) > 0 || (data.trips?.length ?? 0) > 0
  return hasSomething ? migrate(data) : null
}
