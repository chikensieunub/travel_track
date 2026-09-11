/**
 * Invisible formatting characters: zero-width spaces and joiners, soft hyphens,
 * bidi marks, byte order marks. Spreadsheets pick these up from copy-paste and
 * carry them silently, and two names that differ only by one look identical on
 * screen while never comparing equal.
 */
const INVISIBLE = /\p{Cf}/gu

/**
 * The five Vietnamese tone marks, as combining characters: grave, acute, tilde,
 * hook above, dot below.
 *
 * Deliberately not the others. Circumflex, breve, horn and the stroke on đ build
 * different letters - ê is not e, ư is not u - and must never be set aside.
 */
const TONE_MARKS = /[̣̀́̃̉]/g

/**
 * Canonical form for a name, as stored and displayed.
 *
 * Accented text has more than one valid Unicode encoding: "ề" can be a single
 * character or an "e" followed by combining marks. Excel files written on
 * different machines differ, and the two forms are not equal as strings, so
 * everything is brought to one encoding (NFC) on the way in. Nothing about the
 * spelling itself is changed.
 */
export function cleanName(value: string): string {
  return value.replace(INVISIBLE, '').normalize('NFC').trim().replace(/\s+/g, ' ')
}

/**
 * Key for comparing two names.
 *
 * Loose on case, spacing and encoding. Also loose on *where* a tone mark sits:
 * Vietnamese puts the tone on the syllable, and two conventions disagree about
 * which vowel carries it, so Thúy and Thuý are one name spelled two ways. The
 * tone itself still counts - each word keeps the set of tones it had, just not
 * their position - so Thúy, Thùy and Thuy remain three different people.
 */
export function nameKey(value: string): string {
  return cleanName(value)
    .split(' ')
    .map((word) => {
      const decomposed = word.normalize('NFD')
      const tones = (decomposed.match(TONE_MARKS) ?? []).sort().join('')
      return decomposed.replace(TONE_MARKS, '').normalize('NFC') + tones
    })
    .join(' ')
    .toLowerCase()
}
