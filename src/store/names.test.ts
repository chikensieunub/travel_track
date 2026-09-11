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

  test('treats a different tone as a different person', () => {
    // A different tone is a different name. Where that tone is written is not:
    // Thúy and Thuý are one name, covered in "where the tone mark sits" below.
    expect(nameKey('Thúy')).not.toBe(nameKey('Thùy'))
  })

  test('matches a domain name whatever the casing', () => {
    expect(nameKey('ACME\\acruz')).toBe(nameKey('acme\\ACRUZ'))
  })
})

describe('invisible characters', () => {
  // Spreadsheets carry these in from copy-paste, and nobody can see them.
  const INVISIBLES: [string, string][] = [
    ['zero-width space', '​'],
    ['zero-width non-joiner', '‌'],
    ['zero-width joiner', '‍'],
    ['left-to-right mark', '‎'],
    ['soft hyphen', '­'],
    ['byte order mark', '﻿'],
    ['word joiner', '⁠'],
  ]

  test.each(INVISIBLES)('strips a trailing %s', (_label, ch) => {
    expect(cleanName(`Nguyễn Khánh Trung${ch}`)).toBe('Nguyễn Khánh Trung')
  })

  test.each(INVISIBLES)('strips a %s in the middle of a name', (_label, ch) => {
    expect(cleanName(`Nguyễn${ch} Khánh Trung`)).toBe('Nguyễn Khánh Trung')
  })

  test('matches a name carrying an invisible character against a clean one', () => {
    expect(nameKey('Đôn Thị Thúy Hằng​')).toBe(nameKey('Đôn Thị Thúy Hằng'))
  })

  test('treats a non-breaking space as an ordinary space', () => {
    expect(nameKey('Nguyễn Khánh Trung')).toBe(nameKey('Nguyễn Khánh Trung'))
  })

  test('a name made only of invisible characters comes out empty', () => {
    expect(cleanName('​­')).toBe('')
  })

  test('does not strip the characters of the name itself', () => {
    expect(cleanName('Đôn Thị Thúy Hằng')).toBe('Đôn Thị Thúy Hằng')
  })
})

describe('where the tone mark sits', () => {
  // Vietnamese writes the tone on the syllable, and two conventions disagree
  // about which vowel carries it. Both spell the same name.
  test.each([
    ['Thúy', 'Thuý'],
    ['Hoà', 'Hòa'],
    ['Thuỷ', 'Thủy'],
    ['Đôn Thị Thúy Hằng', 'Đôn Thị Thuý Hằng'],
  ])('matches %s against %s', (a, b) => {
    expect(nameKey(a)).toBe(nameKey(b))
  })

  test('still tells a toned name from an untoned one', () => {
    expect(nameKey('Thúy')).not.toBe(nameKey('Thuy'))
  })

  test('still tells one tone from another', () => {
    expect(nameKey('Thúy')).not.toBe(nameKey('Thùy'))
    expect(nameKey('Nguyễn')).not.toBe(nameKey('Nguyên'))
  })

  test.each([
    ['Lê', 'Le', 'circumflex'],
    ['Tư', 'Tu', 'horn'],
    ['Ăn', 'An', 'breve'],
    ['Đức', 'Duc', 'stroke'],
  ])('keeps %s apart from %s, since the %s makes a different letter', (a, b) => {
    expect(nameKey(a)).not.toBe(nameKey(b))
  })

  test('does not move a tone between separate words', () => {
    expect(nameKey('Án Bô')).not.toBe(nameKey('An Bố'))
  })

  test('leaves the displayed name exactly as written', () => {
    expect(cleanName('Đôn Thị Thuý Hằng')).toBe('Đôn Thị Thuý Hằng')
    expect(cleanName('Đôn Thị Thúy Hằng')).toBe('Đôn Thị Thúy Hằng')
  })
})
