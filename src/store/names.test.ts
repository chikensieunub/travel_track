import { describe, test, expect } from 'vitest'
import { cleanName, nameKey } from './names'

const NAME = 'Đôn Thị Thúy Hằng'

describe('cleanName', () => {
  test('trims and collapses whitespace', () => {
    expect(cleanName('  Nguyễn   Khánh  Trung ')).toBe('Nguyễn Khánh Trung')
  })

  test('leaves an ordinary name alone', () => {
    expect(cleanName(NAME)).toBe(NAME)
  })

  test('stores accented text in one canonical encoding', () => {
    // The same name typed on different systems can arrive composed or decomposed.
    expect(cleanName(NAME.normalize('NFD'))).toBe(cleanName(NAME.normalize('NFC')))
  })

  test('keeps the accents themselves', () => {
    expect(cleanName(NAME)).not.toBe('Đon Thi Thuy Hang')
  })

  test('copes with an empty string', () => {
    expect(cleanName('')).toBe('')
  })
})

describe('nameKey', () => {
  test('matches the same name whatever the casing', () => {
    expect(nameKey(NAME)).toBe(nameKey(NAME.toUpperCase()))
  })

  test('matches the same name whatever the spacing', () => {
    expect(nameKey('Nguyễn  Khánh Trung')).toBe(nameKey('Nguyễn Khánh Trung'))
  })

  test('matches a name that arrived in the other Unicode encoding', () => {
    // This is the real defect: Excel files differ, and lowercasing does not fix it.
    expect(nameKey(NAME.normalize('NFD'))).toBe(nameKey(NAME.normalize('NFC')))
  })

  test('still treats a name without accents as a different person', () => {
    expect(nameKey('Nguyen Khanh Trung')).not.toBe(nameKey('Nguyễn Khánh Trung'))
  })

  test('still treats a different tone mark as a different person', () => {
    // Thúy and Thuý are written differently on purpose; we must not merge them.
    expect(nameKey('Thúy')).not.toBe(nameKey('Thuý'))
  })

  test('matches a domain name whatever the casing', () => {
    expect(nameKey('ACME\\acruz')).toBe(nameKey('acme\\ACRUZ'))
  })
})
