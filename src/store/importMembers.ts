import type { MemberDraft } from './types'

export type ImportFieldKey = 'domainName' | 'fullName' | 'directBoss' | 'location'

/** Column mapping: which spreadsheet header feeds each member field. */
export type ColumnMapping = Partial<Record<ImportFieldKey, string>>

export type SheetRow = Record<string, unknown>

interface ImportField {
  key: ImportFieldKey
  label: string
  /** Header spellings we recognise without the user having to map them by hand. */
  aliases: string[]
  required?: boolean
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    key: 'domainName',
    label: 'Domain name',
    aliases: ['domain name', 'domainname', 'domain', 'username', 'user name', 'user id', 'userid', 'account', 'login', 'samaccountname', 'network id'],
    required: true,
  },
  {
    key: 'fullName',
    label: 'Full name',
    aliases: ['full name', 'fullname', 'name', 'employee', 'employee name', 'display name', 'person', 'staff', 'staff name'],
  },
  {
    key: 'directBoss',
    label: 'Direct boss',
    aliases: ['direct boss', 'directboss', 'boss', 'manager', 'line manager', 'supervisor', 'reports to', 'reporting to', 'head', 'superior'],
  },
  {
    key: 'location',
    label: 'Location',
    aliases: ['location', 'site', 'office', 'city', 'country', 'base', 'branch', 'work location', 'duty station'],
  },
]

const normalise = (value: string): string => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

/**
 * Guess which header belongs to which field. Exact alias matches are taken before
 * partial ones, and no header is handed to two fields.
 */
export function matchColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  const taken = new Set<string>()

  const claim = (field: ImportField, test: (header: string) => boolean) => {
    if (mapping[field.key]) return
    const found = headers.find((h) => !taken.has(h) && test(normalise(h)))
    if (found) {
      mapping[field.key] = found
      taken.add(found)
    }
  }

  // Exact matches first, so "Name" cannot steal the column "Full Name" wants.
  for (const field of IMPORT_FIELDS) claim(field, (h) => field.aliases.includes(h))
  for (const field of IMPORT_FIELDS) claim(field, (h) => field.aliases.some((a) => h.includes(a)))

  return mapping
}

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

export interface DraftsResult {
  drafts: MemberDraft[]
  /** Rows that had content but no domain name, so could not be identified. */
  skipped: number
  /** Domain names that appeared more than once in the file; the last row won. */
  duplicates: string[]
}

/** Turn mapped spreadsheet rows into member drafts, keyed uniquely by domain name. */
export function rowsToDrafts(rows: SheetRow[], mapping: ColumnMapping): DraftsResult {
  const read = (row: SheetRow, key: ImportFieldKey): string => {
    const header = mapping[key]
    return header === undefined ? '' : cellText(row[header])
  }

  const byKey = new Map<string, MemberDraft>()
  const duplicates: string[] = []
  let skipped = 0

  for (const row of rows) {
    const domainName = read(row, 'domainName')
    const fullName = read(row, 'fullName')
    const directBoss = read(row, 'directBoss')
    const location = read(row, 'location')

    if (!domainName) {
      // A row with nothing in it is padding, not a problem worth reporting.
      if (fullName || directBoss || location) skipped += 1
      continue
    }

    const key = domainName.toLowerCase()
    if (byKey.has(key)) duplicates.push(domainName)
    byKey.set(key, {
      domainName,
      fullName: fullName || domainName,
      directBoss,
      location,
      active: true,
    })
  }

  return { drafts: [...byKey.values()], skipped, duplicates }
}
