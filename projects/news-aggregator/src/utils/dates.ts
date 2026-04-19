/**
 * Date utilities for the news aggregator. All operations are in UTC —
 * weekly digest cron is Sunday 22:00 UTC, monthly synthesis is
 * min(30, last-day-of-month) at 22:00 UTC.
 */

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function lastDayOfMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29
  return DAYS_IN_MONTH[month - 1]
}

/**
 * The day-of-month on which the monthly synthesis runs for a given
 * year+month. Rule: min(30, last-day-of-month). February is 28 (29 in
 * leap years), all other months are 30.
 *
 * We never use day 31 so the schedule is predictable and every month
 * publishes on roughly the same calendar day.
 */
export function monthlySynthesisDay(year: number, month: number): number {
  return Math.min(30, lastDayOfMonth(year, month))
}

/**
 * True when `now` is exactly the monthly synthesis trigger moment for its
 * month — 22:00:00 UTC on min(30, last-day-of-month). Used by the cron
 * handler to decide whether to run synthesis this tick.
 */
export function isMonthlySynthesisDay(now: Date): boolean {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  return (
    d === monthlySynthesisDay(y, m) &&
    now.getUTCHours() === 22 &&
    now.getUTCMinutes() === 0
  )
}

/**
 * The next monthly synthesis trigger at-or-after `from`. Rolls month on
 * December → January correctly and handles leap-year February.
 */
export function nextMonthlySynthesisDate(from: Date = new Date()): Date {
  let y = from.getUTCFullYear()
  let m = from.getUTCMonth() + 1
  const todayCandidate = new Date(Date.UTC(y, m - 1, monthlySynthesisDay(y, m), 22, 0, 0))
  if (from < todayCandidate) return todayCandidate
  m++
  if (m > 12) { m = 1; y++ }
  return new Date(Date.UTC(y, m - 1, monthlySynthesisDay(y, m), 22, 0, 0))
}

const DAY_MS = 86_400_000

/**
 * Compute the weekly digest period (Mon 00:00 UTC to next Mon 00:00 UTC,
 * end-exclusive) for a reference timestamp. Finds the most recent Sunday
 * at-or-before `ref` and returns the week that Sunday closes.
 *
 * - Called from the Sunday 22:00 UTC cron: returns the week Mon-Sun
 *   that just ended.
 * - Called on a Monday (e.g. missed-cron backfill): returns the prior
 *   week Mon-Sun.
 */
export function weeklyDigestPeriod(ref: Date): { start: Date; end: Date } {
  const dow = ref.getUTCDay() // 0 = Sunday, 1 = Monday, …, 6 = Saturday
  // Find most recent Sunday at-or-before ref. On Sunday dow=0 this is today;
  // on any other day it's the previous Sunday. The returned window is the
  // Mon-Mon week that Sunday closes — i.e. the most recently COMPLETED week.
  // For mid-week manual runs, use currentWeekPeriod() instead.
  const sundayUtcMs = Date.UTC(
    ref.getUTCFullYear(),
    ref.getUTCMonth(),
    ref.getUTCDate() - dow,
    0, 0, 0,
  )
  const end = new Date(sundayUtcMs + DAY_MS)
  const start = new Date(sundayUtcMs - 6 * DAY_MS)
  return { start, end }
}

export function currentWeekPeriod(ref: Date): { start: Date; end: Date } {
  const dow = ref.getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const mondayMs = Date.UTC(
    ref.getUTCFullYear(),
    ref.getUTCMonth(),
    ref.getUTCDate() + mondayOffset,
    0, 0, 0,
  )
  return { start: new Date(mondayMs), end: new Date(mondayMs + 7 * DAY_MS) }
}
