import { describe, test, expect } from 'vitest'
import { matchColumns, rowsToDrafts, IMPORT_FIELDS } from './importMembers'

// Domain names really do contain backslashes, so build them explicitly.
const DOMAIN = 'ACME\\acruz'
const LOWER = 'acme\\a'
const UPPER = 'ACME\\A'

describe('matchColumns', () => {
  test('matches headers that name the field exactly, whatever the casing', () => {
    const result = matchColumns(['Domain Name', 'FULL NAME', 'direct boss', 'Location'])
    expect(result).toEqual({
      domainName: 'Domain Name',
      fullName: 'FULL NAME',
      directBoss: 'direct boss',
      location: 'Location',
    })
  })

  test('matches common alternative names for each field', () => {
    const result = matchColumns(['Username', 'Employee', 'Manager', 'Office'])
    expect(result).toEqual({
      domainName: 'Username',
      fullName: 'Employee',
      directBoss: 'Manager',
      location: 'Office',
    })
  })

  test('ignores surrounding whitespace in headers', () => {
    expect(matchColumns(['  domain  ']).domainName).toBe('  domain  ')
  })

  test('leaves a field unmatched when no header suits it', () => {
    const result = matchColumns(['Domain', 'Full Name'])
    expect(result.domainName).toBe('Domain')
    expect(result.directBoss).toBeUndefined()
    expect(result.location).toBeUndefined()
  })

  test('does not assign one header to two different fields', () => {
    const result = matchColumns(['Name'])
    const claimed = Object.values(result).filter(Boolean)
    expect(new Set(claimed).size).toBe(claimed.length)
  })

  test('every importable field is offered', () => {
    expect(IMPORT_FIELDS.map((f) => f.key)).toEqual(['domainName', 'fullName', 'directBoss', 'location'])
  })
})

describe('rowsToDrafts', () => {
  const mapping = { domainName: 'Domain', fullName: 'Name', directBoss: 'Manager', location: 'Site' }

  test('turns mapped rows into member drafts', () => {
    const { drafts } = rowsToDrafts(
      [{ Domain: DOMAIN, Name: 'Ana Cruz', Manager: 'Ben Ortiz', Site: 'Manila' }],
      mapping,
    )
    expect(drafts).toEqual([
      { domainName: DOMAIN, fullName: 'Ana Cruz', directBoss: 'Ben Ortiz', location: 'Manila', active: true },
    ])
  })

  test('trims whitespace around every value', () => {
    const { drafts } = rowsToDrafts(
      [{ Domain: `  ${DOMAIN}  `, Name: ' Ana ', Manager: ' Ben ', Site: ' Manila ' }],
      mapping,
    )
    expect(drafts[0]).toMatchObject({ domainName: DOMAIN, fullName: 'Ana', directBoss: 'Ben', location: 'Manila' })
  })

  test('a row without a domain name is skipped and counted', () => {
    const { drafts, skipped } = rowsToDrafts(
      [
        { Domain: '', Name: 'Nobody', Manager: '', Site: '' },
        { Domain: DOMAIN, Name: 'Ana', Manager: '', Site: '' },
      ],
      mapping,
    )
    expect(drafts).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  test('a completely blank row is skipped without being reported as a problem', () => {
    const { drafts, skipped } = rowsToDrafts([{ Domain: '', Name: '', Manager: '', Site: '' }], mapping)
    expect(drafts).toHaveLength(0)
    expect(skipped).toBe(0)
  })

  test('falls back to the domain name when the full name column is empty', () => {
    const { drafts } = rowsToDrafts([{ Domain: DOMAIN, Name: '', Manager: '', Site: '' }], mapping)
    expect(drafts[0].fullName).toBe(DOMAIN)
  })

  test('later rows win when the same domain name repeats in different casing', () => {
    const { drafts, duplicates } = rowsToDrafts(
      [
        { Domain: LOWER, Name: 'Old Name', Manager: '', Site: 'Manila' },
        { Domain: UPPER, Name: 'New Name', Manager: '', Site: 'Cebu' },
      ],
      mapping,
    )
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({ fullName: 'New Name', location: 'Cebu' })
    expect(duplicates).toEqual([UPPER])
  })

  test('unmapped fields come through empty rather than undefined', () => {
    const { drafts } = rowsToDrafts([{ Domain: DOMAIN, Name: 'Ana' }], { domainName: 'Domain', fullName: 'Name' })
    expect(drafts[0]).toMatchObject({ directBoss: '', location: '' })
  })

  test('numeric cell values are read as text', () => {
    const { drafts } = rowsToDrafts([{ Domain: 12345, Name: 'Ana' }], { domainName: 'Domain', fullName: 'Name' })
    expect(drafts[0].domainName).toBe('12345')
  })
})
