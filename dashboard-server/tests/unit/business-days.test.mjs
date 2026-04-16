// dashboard-server/tests/unit/business-days.test.mjs
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { addBusinessDays, businessDaysBetween } = require('../../server.js');

describe('addBusinessDays', () => {
  it('adds 5 business days from Monday = next Monday', () => {
    // 2026-04-13 is a Monday
    expect(addBusinessDays('2026-04-13', 5)).toBe('2026-04-20');
  });

  it('adds 1 business day from Friday = next Monday', () => {
    // 2026-04-17 is a Friday
    expect(addBusinessDays('2026-04-17', 1)).toBe('2026-04-20');
  });

  it('adds 0 business days returns same date', () => {
    expect(addBusinessDays('2026-04-14', 0)).toBe('2026-04-14');
  });

  it('skips weekends when counting forward', () => {
    // 2026-04-16 is Thursday, +3 = next Tuesday (skip Sat+Sun)
    expect(addBusinessDays('2026-04-16', 3)).toBe('2026-04-21');
  });
});

describe('businessDaysBetween', () => {
  it('same day = 0', () => {
    expect(businessDaysBetween('2026-04-14', '2026-04-14')).toBe(0);
  });

  it('Monday to Friday = 4', () => {
    expect(businessDaysBetween('2026-04-13', '2026-04-17')).toBe(4);
  });

  it('Friday to next Monday = 1 (skips weekend)', () => {
    expect(businessDaysBetween('2026-04-17', '2026-04-20')).toBe(1);
  });

  it('negative when b < a', () => {
    expect(businessDaysBetween('2026-04-17', '2026-04-14')).toBe(-3);
  });
});
