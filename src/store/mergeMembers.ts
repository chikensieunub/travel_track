import type { Member, MemberDraft, TravelData } from './types'
import { addMember } from './operations'

export interface MergeResult {
  data: TravelData
  added: number
  updated: number
}

/** Domain names identify people, and case is not meaningful in them. */
const key = (domainName: string): string => domainName.trim().toLowerCase()

/**
 * Fold imported rows into the roster, keyed on domain name.
 *
 * Existing people keep their id - so their trip assignments survive - and keep
 * their active flag, since whether someone has left is a decision made here,
 * not in the source file. People absent from the file are left untouched.
 */
export function mergeMembers(data: TravelData, drafts: MemberDraft[]): MergeResult {
  const existing = new Map(data.members.map((m) => [key(m.domainName), m]))
  const updates = new Map<string, Member>()
  const fresh: MemberDraft[] = []

  for (const d of drafts) {
    const found = existing.get(key(d.domainName))
    if (found) {
      updates.set(found.id, {
        ...found,
        domainName: d.domainName,
        fullName: d.fullName,
        directBoss: d.directBoss,
        location: d.location,
      })
    } else {
      fresh.push(d)
    }
  }

  let next: TravelData = {
    ...data,
    members: data.members.map((m) => updates.get(m.id) ?? m),
  }
  for (const d of fresh) next = addMember(next, d)

  return { data: next, added: fresh.length, updated: updates.size }
}

/** What an import would do, without doing it. */
export function previewMerge(data: TravelData, drafts: MemberDraft[]): { added: number; updated: number } {
  const { added, updated } = mergeMembers(data, drafts)
  return { added, updated }
}
