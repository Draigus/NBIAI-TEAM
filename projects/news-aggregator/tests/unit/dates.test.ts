import { describe, it, expect } from 'vitest'
import {
  isLeapYear,
  lastDayOfMonth,
  monthlySynthesisDay,
  isMonthlySynthesisDay,
  nextMonthlySynthesisDate,
  weeklyDigestPeriod,
} from '../../src/utils/dates.js'

describe('isLeapYear', () => {
  it('standard leap years', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2028)).toBe(true)
  })
  it('standard non-leap years', () => {
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(2025)).toBe(false)
  })
  it('century rule: 1900 not leap, 2000 leap', () => {
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(2100)).toBe(false)
    expect(isLeapYear(2400)).toBe(true)
  })
})

describe('lastDayOfMonth', () => {
  it('returns 31 for 31-day months', () => {
    expect(lastDayOfMonth(2026, 1)).toBe(31)
    expect(lastDayOfMonth(2026, 7)).toBe(31)
    expect(lastDayOfMonth(2026, 12)).toBe(31)
  })
  it('returns 30 for 30-day months', () => {
    expect(lastDayOfMonth(2026, 4)).toBe(30)
    expect(lastDayOfMonth(2026, 9)).toBe(30)
  })
  it('returns 28 for February non-leap', () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28)
  })
  it('returns 29 for February leap', () => {
    expect(lastDayOfMonth(2024, 2)).toBe(29)
  })
})

describe('monthlySynthesisDay', () => {
  it('returns 30 for 31-day months', () => {
    expect(monthlySynthesisDay(2026, 1)).toBe(30)
    expect(monthlySynthesisDay(2026, 3)).toBe(30)
    expect(monthlySynthesisDay(2026, 12)).toBe(30)
  })
  it('returns 30 for 30-day months', () => {
    expect(monthlySynthesisDay(2026, 4)).toBe(30)
  })
  it('returns 28 for February non-leap', () => {
    expect(monthlySynthesisDay(2026, 2)).toBe(28)
  })
  it('returns 29 for February leap year', () => {
    expect(monthlySynthesisDay(2024, 2)).toBe(29)
    expect(monthlySynthesisDay(2028, 2)).toBe(29)
  })
  it('century rules: 1900 = 28, 2000 = 29, 2400 = 29', () => {
    expect(monthlySynthesisDay(1900, 2)).toBe(28)
    expect(monthlySynthesisDay(2000, 2)).toBe(29)
    expect(monthlySynthesisDay(2400, 2)).toBe(29)
  })
})

describe('isMonthlySynthesisDay', () => {
  it('true at 22:00 UTC on month-end Feb (non-leap)', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 1, 28, 22, 0, 0)))).toBe(true)
  })
  it('true at 22:00 UTC on day 30 of a 30-day month', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 3, 30, 22, 0, 0)))).toBe(true) // Apr 30
  })
  it('true at 22:00 UTC on day 30 of a 31-day month (not 31)', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 0, 30, 22, 0, 0)))).toBe(true) // Jan 30
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 0, 31, 22, 0, 0)))).toBe(false) // Jan 31
  })
  it('true at 22:00 UTC on Feb 29 in a leap year', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2024, 1, 29, 22, 0, 0)))).toBe(true)
  })
  it('false at any other minute', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 1, 28, 21, 59, 0)))).toBe(false)
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 1, 28, 22, 1, 0)))).toBe(false)
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 1, 28, 23, 0, 0)))).toBe(false)
  })
  it('false on other days', () => {
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 1, 27, 22, 0, 0)))).toBe(false)
    expect(isMonthlySynthesisDay(new Date(Date.UTC(2026, 0, 15, 22, 0, 0)))).toBe(false)
  })
})

describe('nextMonthlySynthesisDate', () => {
  it('returns today\'s trigger if now is before it', () => {
    const from = new Date(Date.UTC(2026, 0, 30, 21, 0, 0)) // Jan 30 at 21:00, before 22:00
    const next = nextMonthlySynthesisDate(from)
    expect(next.toISOString()).toBe('2026-01-30T22:00:00.000Z')
  })
  it('jumps to next month if now is after today\'s trigger', () => {
    const from = new Date(Date.UTC(2026, 0, 30, 22, 0, 1)) // 1s after Jan 30 22:00
    const next = nextMonthlySynthesisDate(from)
    expect(next.toISOString()).toBe('2026-02-28T22:00:00.000Z')
  })
  it('rolls December to next January', () => {
    const from = new Date(Date.UTC(2026, 11, 30, 23, 0, 0)) // Dec 30 23:00
    const next = nextMonthlySynthesisDate(from)
    expect(next.toISOString()).toBe('2027-01-30T22:00:00.000Z')
  })
  it('handles leap year Feb 29', () => {
    const from = new Date(Date.UTC(2024, 1, 15, 0, 0, 0))
    const next = nextMonthlySynthesisDate(from)
    expect(next.toISOString()).toBe('2024-02-29T22:00:00.000Z')
  })
  it('if already past this month\'s synthesis day, jumps to next month', () => {
    // Jan 31 is after Jan 30 — next trigger is Feb 28
    const from = new Date(Date.UTC(2026, 0, 31, 12, 0, 0))
    const next = nextMonthlySynthesisDate(from)
    expect(next.toISOString()).toBe('2026-02-28T22:00:00.000Z')
  })
})

describe('weeklyDigestPeriod', () => {
  it('Sunday 22:00 UTC as input returns the past full Mon-Sun week', () => {
    // Sunday 2026-04-12 22:00 UTC
    const ref = new Date(Date.UTC(2026, 3, 12, 22, 0, 0))
    const { start, end } = weeklyDigestPeriod(ref)
    // Past week Mon-Sun: 2026-04-06 00:00 to 2026-04-13 00:00 (exclusive)
    expect(start.toISOString()).toBe('2026-04-06T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-04-13T00:00:00.000Z')
  })
  it('computes the correct period when called on a Monday', () => {
    const ref = new Date(Date.UTC(2026, 3, 13, 10, 0, 0)) // Monday
    const { start, end } = weeklyDigestPeriod(ref)
    // Previous week Mon-Sun
    expect(start.toISOString()).toBe('2026-04-06T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-04-13T00:00:00.000Z')
  })
})
