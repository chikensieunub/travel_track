/**
 * Canonical form for a name, as stored and displayed.
 *
 * Accented text has more than one valid Unicode encoding: "ề" can be a single
 * character or an "e" followed by combining marks. Excel files written on
 * different machines differ, and the two forms are not equal as strings, so
 * everything is brought to one encoding (NFC) on the way in. Accents themselves
 * are kept - in Vietnamese names they distinguish different people.
 */
export function cleanName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ')
}

/** Key for comparing two names: canonical encoding, loose on case and spacing. */
export function nameKey(value: string): string {
  return cleanName(value).toLowerCase()
}
