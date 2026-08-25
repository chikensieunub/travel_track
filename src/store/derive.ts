import type { Trip } from './types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 86_400_000

/** Parse an ISO yyyy-mm-dd date as UTC midnight, so no timezone can shift the day. */
function parseDay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** The trip's last day, inclusive: a 1-day trip ends the day it starts. */
export function endDate(trip: Trip): string {
  return toIso(parseDay(trip.startDate) + (Math.max(1, trip.durationDays) - 1) * DAY_MS)
}

/** True when two different trips share at least one calendar day. */
export function tripOverlaps(a: Trip, b: Trip): boolean {
  if (a.id === b.id) return false
  return parseDay(a.startDate) <= parseDay(endDate(b)) && parseDay(b.startDate) <= parseDay(endDate(a))
}

/** A trip is past only once its final day is behind us; a trip ending today still counts as current. */
export function isPast(trip: Trip, today: string): boolean {
  return parseDay(endDate(trip)) < parseDay(today)
}

function humanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function formatRange(trip: Trip): string {
  const days = Math.max(1, trip.durationDays)
  const start = humanDate(trip.startDate)
  if (days === 1) return `${start} · 1 day`
  return `${start} → ${humanDate(endDate(trip))} · ${days} days`
}
