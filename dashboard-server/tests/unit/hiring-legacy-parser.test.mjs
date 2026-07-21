// dashboard-server/tests/unit/hiring-legacy-parser.test.mjs
//
// Unit tests for lib/hiring-legacy-parser.js — the pure parser that extracts
// structured planning values from legacy hiring_positions.description text.
//
// The recognised labels mirror _parsePositionDesc in
// public/js/domains/nbi-hiring.js exactly:
//   Annual Salary:, Monthly:, Original Currency:, Planned Start:,
//   Priority:, Recruitment Status:, Type: Contract
//
// Migration ethos under test: parse only confident values, never guess,
// never infer a currency from a symbol alone when Original Currency is
// absent, report everything unparseable as structured exceptions.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  parseLegacyHiringDescription,
  parseMoneyText,
  parseMonthText,
} = require('../../lib/hiring-legacy-parser.js');

describe('parseLegacyHiringDescription', () => {
  it('extracts recognised fields and preserves narrative lines', () => {
    const result = parseLegacyHiringDescription([
      'Own the client launch.',
      'Annual Salary: £96,000',
      'Original Currency: GBP',
      'Planned Start: September 2026',
      'Priority: 1',
      'Recruitment Status: Confirmed'
    ].join('\n'));
    expect(result.values).toMatchObject({
      budgeted_compensation: '96000',
      compensation_currency: 'GBP',
      compensation_basis: 'annual',
      target_start_month: '2026-09-01',
      priority: 1
    });
    expect(result.cleanDescription).toBe('Own the client launch.');
    expect(result.exceptions).toEqual([]);
  });

  it('handles null, undefined and empty descriptions', () => {
    for (const input of [null, undefined, '']) {
      const result = parseLegacyHiringDescription(input);
      expect(result.values).toEqual({});
      expect(result.cleanDescription).toBe('');
      expect(result.recognisedLines).toEqual([]);
      expect(result.exceptions).toEqual([]);
    }
  });

  it('maps Monthly: to a monthly compensation basis', () => {
    const result = parseLegacyHiringDescription([
      'Monthly: €3,500',
      'Original Currency: EUR'
    ].join('\n'));
    expect(result.values).toMatchObject({
      budgeted_compensation: '3500',
      compensation_currency: 'EUR',
      compensation_basis: 'monthly'
    });
    expect(result.exceptions).toEqual([]);
  });

  it('never infers currency from a symbol alone when Original Currency is absent', () => {
    const result = parseLegacyHiringDescription('Annual Salary: £96,000');
    expect(result.values.budgeted_compensation).toBe('96000');
    expect(result.values.compensation_basis).toBe('annual');
    expect(result.values.compensation_currency).toBeUndefined();
    expect(result.exceptions).toEqual([]);
  });

  it('never uses an explicit code inside the money text as the currency', () => {
    // Conservative rule: compensation_currency comes only from the
    // Original Currency line. A code embedded in the money text is used
    // for conflict detection, never as a source.
    const result = parseLegacyHiringDescription('Annual Salary: EUR 45,000');
    expect(result.values.budgeted_compensation).toBe('45000');
    expect(result.values.compensation_currency).toBeUndefined();
    expect(result.exceptions).toEqual([]);
  });

  it('flags a conflict when the money text code disagrees with Original Currency', () => {
    const result = parseLegacyHiringDescription([
      'Annual Salary: EUR 50,000',
      'Original Currency: GBP'
    ].join('\n'));
    expect(result.values.compensation_currency).toBeUndefined();
    expect(result.values.budgeted_compensation).toBe('50000');
    expect(result.exceptions).toEqual([
      expect.objectContaining({ field: 'compensation_currency', reason: expect.stringContaining('conflict') })
    ]);
    // The contradicted Original Currency line stays visible for review and
    // drops out of recognisedLines; the money line still contributed values.
    expect(result.cleanDescription).toBe('Original Currency: GBP');
    expect(result.recognisedLines).toEqual([
      expect.objectContaining({ label: 'Annual Salary', value: 'EUR 50,000' })
    ]);
  });

  it('flags a conflict when both Annual Salary and Monthly appear', () => {
    const result = parseLegacyHiringDescription([
      'Annual Salary: £60,000',
      'Monthly: £5,000'
    ].join('\n'));
    expect(result.values.budgeted_compensation).toBeUndefined();
    expect(result.values.compensation_basis).toBeUndefined();
    expect(result.exceptions).toEqual([
      expect.objectContaining({ field: 'compensation_basis', reason: expect.stringContaining('conflict') })
    ]);
    // Neither line produced a value, so both stay visible for review and
    // neither is listed as recognised.
    expect(result.cleanDescription).toBe('Annual Salary: £60,000\nMonthly: £5,000');
    expect(result.recognisedLines).toEqual([]);
  });

  it('still detects a currency contradiction when both Annual Salary and Monthly are present', () => {
    // Pins the cross-check ordering: the embedded-code contradiction must be
    // detected even when the basis also conflicts. Every money line says EUR
    // while Original Currency says GBP - GBP must NOT be written.
    const result = parseLegacyHiringDescription([
      'Annual Salary: EUR 50,000',
      'Monthly: EUR 4,000',
      'Original Currency: GBP'
    ].join('\n'));
    expect(result.values.compensation_currency).toBeUndefined();
    expect(result.values.budgeted_compensation).toBeUndefined();
    expect(result.values.compensation_basis).toBeUndefined();
    expect(result.exceptions).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'compensation_currency', reason: expect.stringContaining('conflict') }),
      expect.objectContaining({ field: 'compensation_basis', reason: expect.stringContaining('conflict') })
    ]));
    expect(result.exceptions).toHaveLength(2);
    // Nothing was written, so all three lines stay visible for review.
    expect(result.cleanDescription).toBe([
      'Annual Salary: EUR 50,000',
      'Monthly: EUR 4,000',
      'Original Currency: GBP'
    ].join('\n'));
    expect(result.recognisedLines).toEqual([]);
  });

  it('records malformed money as a structured exception and keeps the line in cleanDescription', () => {
    const result = parseLegacyHiringDescription([
      'Great role.',
      'Annual Salary: TBC'
    ].join('\n'));
    expect(result.values.budgeted_compensation).toBeUndefined();
    expect(result.values.compensation_basis).toBeUndefined();
    expect(result.exceptions).toEqual([
      expect.objectContaining({ field: 'budgeted_compensation', input: 'TBC' })
    ]);
    expect(result.cleanDescription).toBe('Great role.\nAnnual Salary: TBC');
  });

  it('rejects salary ranges as exceptions rather than guessing', () => {
    const result = parseLegacyHiringDescription('Annual Salary: £40,000 - £50,000');
    expect(result.values.budgeted_compensation).toBeUndefined();
    expect(result.exceptions).toHaveLength(1);
    expect(result.exceptions[0].field).toBe('budgeted_compensation');
  });

  it('records a malformed Original Currency as an exception', () => {
    const result = parseLegacyHiringDescription('Original Currency: Pounds');
    expect(result.values.compensation_currency).toBeUndefined();
    expect(result.exceptions).toEqual([
      expect.objectContaining({ field: 'compensation_currency', input: 'Pounds' })
    ]);
  });

  it('parses abbreviated and ISO month formats', () => {
    expect(parseLegacyHiringDescription('Planned Start: Sep 2026').values.target_start_month).toBe('2026-09-01');
    expect(parseLegacyHiringDescription('Planned Start: 2026-09').values.target_start_month).toBe('2026-09-01');
    expect(parseLegacyHiringDescription('Planned Start: 2026-09-01').values.target_start_month).toBe('2026-09-01');
  });

  it('rejects ambiguous planned start values as exceptions', () => {
    for (const bad of ['Q3 2026', 'ASAP', '09/2026', 'September']) {
      const result = parseLegacyHiringDescription(`Planned Start: ${bad}`);
      expect(result.values.target_start_month, bad).toBeUndefined();
      expect(result.exceptions, bad).toEqual([
        expect.objectContaining({ field: 'target_start_month', input: bad })
      ]);
    }
  });

  it('treats Priority: None as recognised with no value and no exception', () => {
    const result = parseLegacyHiringDescription([
      'Narrative.',
      'Priority: None'
    ].join('\n'));
    expect(result.values.priority).toBeUndefined();
    expect(result.exceptions).toEqual([]);
    expect(result.cleanDescription).toBe('Narrative.');
    expect(result.recognisedLines).toEqual([
      expect.objectContaining({ label: 'Priority', value: 'None' })
    ]);
  });

  it('accepts priorities 0 to 4 and rejects anything else', () => {
    expect(parseLegacyHiringDescription('Priority: 0').values.priority).toBe(0);
    expect(parseLegacyHiringDescription('Priority: 4').values.priority).toBe(4);
    for (const bad of ['7', '-1', '2.5', 'High']) {
      const result = parseLegacyHiringDescription(`Priority: ${bad}`);
      expect(result.values.priority, bad).toBeUndefined();
      expect(result.exceptions, bad).toEqual([
        expect.objectContaining({ field: 'priority', input: bad })
      ]);
    }
  });

  it('records Recruitment Status as recognised but maps it to no column', () => {
    const result = parseLegacyHiringDescription('Recruitment Status: Confirmed');
    expect(result.values).toEqual({});
    expect(result.recognisedLines).toEqual([
      expect.objectContaining({ label: 'Recruitment Status', value: 'Confirmed' })
    ]);
    expect(result.exceptions).toEqual([]);
    expect(result.cleanDescription).toBe('');
  });

  it('maps Type: Contract to the canonical contractor employment type', () => {
    const result = parseLegacyHiringDescription('Type: Contract');
    expect(result.values.employment_type).toBe('contractor');
    expect(result.exceptions).toEqual([]);
    expect(result.cleanDescription).toBe('');
  });

  it('leaves other Type: lines in the narrative, matching the frontend parser', () => {
    // _parsePositionDesc only special-cases 'Type: Contract'.
    const result = parseLegacyHiringDescription('Type: Permanent');
    expect(result.values.employment_type).toBeUndefined();
    expect(result.recognisedLines).toEqual([]);
    expect(result.exceptions).toEqual([]);
    expect(result.cleanDescription).toBe('Type: Permanent');
  });

  it('trims indented label lines the way the frontend does', () => {
    const result = parseLegacyHiringDescription('   Priority: 2');
    expect(result.values.priority).toBe(2);
    expect(result.cleanDescription).toBe('');
  });

  it('preserves interior narrative structure and trims boundary blank lines', () => {
    const result = parseLegacyHiringDescription([
      '',
      'First paragraph.',
      '',
      'Second paragraph.',
      'Priority: 3',
      ''
    ].join('\n'));
    expect(result.cleanDescription).toBe('First paragraph.\n\nSecond paragraph.');
    expect(result.values.priority).toBe(3);
  });

  it('lists every recognised line with its label and raw value', () => {
    const result = parseLegacyHiringDescription([
      'Annual Salary: £96,000',
      'Planned Start: September 2026'
    ].join('\n'));
    expect(result.recognisedLines).toEqual([
      expect.objectContaining({ label: 'Annual Salary', value: '£96,000' }),
      expect.objectContaining({ label: 'Planned Start', value: 'September 2026' })
    ]);
  });
});

describe('parseMoneyText', () => {
  it('parses symbol-prefixed amounts with thousands separators', () => {
    expect(parseMoneyText('£96,000')).toEqual({ ok: true, amount: '96000', currencyCode: null, symbol: '£' });
    expect(parseMoneyText('$1,250,000')).toEqual({ ok: true, amount: '1250000', currencyCode: null, symbol: '$' });
    expect(parseMoneyText('€3,500.50')).toEqual({ ok: true, amount: '3500.50', currencyCode: null, symbol: '€' });
  });

  it('parses bare and code-annotated amounts', () => {
    expect(parseMoneyText('96000')).toEqual({ ok: true, amount: '96000', currencyCode: null, symbol: null });
    expect(parseMoneyText('EUR 45,000')).toEqual({ ok: true, amount: '45000', currencyCode: 'EUR', symbol: null });
    expect(parseMoneyText('45,000 EUR')).toEqual({ ok: true, amount: '45000', currencyCode: 'EUR', symbol: null });
  });

  it('rejects malformed grouping, shorthand, ranges, zero and non-numbers', () => {
    for (const bad of ['9,6000', '£96k', '40,000 - 50,000', '0', '-500', 'TBC', '', '£']) {
      const result = parseMoneyText(bad);
      expect(result.ok, JSON.stringify(bad)).toBe(false);
      expect(typeof result.reason).toBe('string');
    }
  });
});

describe('parseMonthText', () => {
  it('parses full month names, abbreviations and ISO forms', () => {
    expect(parseMonthText('September 2026')).toEqual({ ok: true, isoDate: '2026-09-01' });
    expect(parseMonthText('september 2026')).toEqual({ ok: true, isoDate: '2026-09-01' });
    expect(parseMonthText('Sep 2026')).toEqual({ ok: true, isoDate: '2026-09-01' });
    expect(parseMonthText('Sept 2026')).toEqual({ ok: true, isoDate: '2026-09-01' });
    expect(parseMonthText('January 2027')).toEqual({ ok: true, isoDate: '2027-01-01' });
    expect(parseMonthText('2026-03')).toEqual({ ok: true, isoDate: '2026-03-01' });
    expect(parseMonthText('2026-03-01')).toEqual({ ok: true, isoDate: '2026-03-01' });
  });

  it('floors an unambiguous full ISO date to the first of its month', () => {
    expect(parseMonthText('2026-09-15')).toEqual({ ok: true, isoDate: '2026-09-01' });
  });

  it('rejects ambiguous or unsupported forms', () => {
    for (const bad of ['Q3 2026', '09/2026', 'September', '2026', 'ASAP', 'Foo 2026', '2026-13', '']) {
      const result = parseMonthText(bad);
      expect(result.ok, JSON.stringify(bad)).toBe(false);
      expect(typeof result.reason).toBe('string');
    }
  });
});
