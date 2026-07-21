// dashboard-server/lib/hiring-legacy-parser.js
//
// Pure parser for legacy hiring_positions.description text. Legacy positions
// stored planning data (salary, currency, start month, priority, recruiting
// status) as labelled lines inside the free-text description. This module
// extracts those recognised lines into the structured columns added by
// migration 084_hiring_plan.sql.
//
// The recognised labels mirror _parsePositionDesc in
// public/js/domains/nbi-hiring.js exactly:
//   Annual Salary:, Monthly:, Original Currency:, Planned Start:,
//   Priority:, Recruitment Status:, Type: Contract
//
// Confidence rules (binding migration ethos):
//   - Parse only confident values; never guess.
//   - compensation_currency comes ONLY from the 'Original Currency:' line.
//     A currency symbol or an explicit code inside the money text is never
//     used as a source; a code is used for conflict detection only.
//   - Ambiguous dates, ranges and shorthand ('96k', 'Q3 2026') become
//     structured exceptions { field, input, reason }, not values.
//   - 'Recruitment Status:' maps to no column (derived state now); it is
//     recorded as a recognised line only.
//   - If both 'Annual Salary:' and 'Monthly:' appear, that is a conflict
//     exception, not a guess.
//
// This module is PURE: no database access, no filesystem access. All DB work
// lives in scripts/backfill-hiring-plan.js. cleanDescription is a review aid
// for reports only; it is never written back to the database.

'use strict';

const MONTHS = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

// Amount: plain digits, or digits grouped in threes with commas, with an
// optional decimal part. Anything else (bad grouping, 'k' shorthand, ranges)
// is rejected rather than guessed at.
const AMOUNT_RE = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;
const CURRENCY_SYMBOLS = ['£', '$', '€'];

/**
 * Parse a money value such as '£96,000', 'EUR 45,000' or '3500.50'.
 * Returns { ok: true, amount, currencyCode, symbol } where amount is a
 * numeric STRING (no separators) to avoid float drift into NUMERIC columns,
 * or { ok: false, reason } when the text is not a single confident amount.
 */
function parseMoneyText(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, reason: 'empty money text' };
  }
  let rest = text.trim();
  let symbol = null;
  let currencyCode = null;

  // Leading or trailing ISO-style code, e.g. 'EUR 45,000' or '45,000 EUR'.
  const leadingCode = rest.match(/^([A-Za-z]{3})\s+(.+)$/);
  const trailingCode = rest.match(/^(.+?)\s+([A-Za-z]{3})$/);
  if (leadingCode) {
    currencyCode = leadingCode[1].toUpperCase();
    rest = leadingCode[2].trim();
  } else if (trailingCode) {
    currencyCode = trailingCode[2].toUpperCase();
    rest = trailingCode[1].trim();
  }

  // Leading currency symbol, e.g. '£96,000'.
  for (const s of CURRENCY_SYMBOLS) {
    if (rest.startsWith(s)) {
      symbol = s;
      rest = rest.slice(s.length).trim();
      break;
    }
  }

  if (rest === '') {
    return { ok: false, reason: 'no amount found in money text' };
  }
  if (!AMOUNT_RE.test(rest)) {
    return { ok: false, reason: 'not a single unambiguous amount (ranges, shorthand and malformed grouping are rejected)' };
  }

  const amount = rest.replace(/,/g, '');
  if (Number(amount) <= 0) {
    return { ok: false, reason: 'amount must be greater than zero' };
  }
  return { ok: true, amount, currencyCode, symbol };
}

/**
 * Parse a planned-start month such as 'September 2026', 'Sep 2026',
 * '2026-09' or '2026-09-15'. Returns { ok: true, isoDate } with the ISO
 * first-of-month date, or { ok: false, reason } for ambiguous or
 * unsupported forms.
 */
function parseMonthText(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, reason: 'empty month text' };
  }
  const t = text.trim();

  // 'September 2026' / 'Sep 2026' / 'Sept 2026'
  const nameYear = t.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (nameYear) {
    const month = MONTHS[nameYear[1].toLowerCase()];
    if (!month) {
      return { ok: false, reason: `unknown month name '${nameYear[1]}'` };
    }
    return { ok: true, isoDate: `${nameYear[2]}-${String(month).padStart(2, '0')}-01` };
  }

  // '2026-09' or '2026-09-15' (full ISO date floors to the first of month;
  // the month itself is unambiguous).
  const iso = t.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) {
    const month = Number(iso[2]);
    if (month < 1 || month > 12) {
      return { ok: false, reason: `month out of range in '${t}'` };
    }
    if (iso[3] !== undefined) {
      const day = Number(iso[3]);
      if (day < 1 || day > 31) {
        return { ok: false, reason: `day out of range in '${t}'` };
      }
    }
    return { ok: true, isoDate: `${iso[1]}-${iso[2]}-01` };
  }

  // Everything else ('Q3 2026', '09/2026', bare month, bare year, 'ASAP')
  // is ambiguous or unsupported. Never guess.
  return { ok: false, reason: `ambiguous or unsupported month format '${t}'` };
}

/**
 * Parse a legacy hiring position description.
 *
 * Returns:
 *   values          - confidently parsed structured column values. Keys:
 *                     budgeted_compensation (numeric string),
 *                     compensation_currency, compensation_basis,
 *                     target_start_month (ISO first-of-month), priority
 *                     (integer 0-4), employment_type (canonical value).
 *                     Only present when confidently parsed.
 *   cleanDescription - the description with successfully handled recognised
 *                     lines removed and boundary blank lines trimmed.
 *                     Malformed recognised lines are kept so a reviewer can
 *                     see what did not parse. REVIEW AID ONLY - never
 *                     written to the database.
 *   recognisedLines - [{ label, value, line }] for every line whose label
 *                     matched and whose value was handled confidently.
 *   exceptions      - [{ field, input, reason }] for every recognised label
 *                     whose value could not be parsed confidently.
 */
function parseLegacyHiringDescription(desc) {
  const values = {};
  const recognisedLines = [];
  const exceptions = [];

  if (typeof desc !== 'string' || desc === '') {
    return { values, cleanDescription: '', recognisedLines, exceptions };
  }

  const lines = desc.split('\n');
  const keptLines = [];
  let annual = null;   // parsed 'Annual Salary:' money result
  let monthly = null;  // parsed 'Monthly:' money result

  for (const line of lines) {
    const l = line.trim();
    let handled = false;

    if (l.startsWith('Annual Salary:')) {
      const raw = l.replace('Annual Salary:', '').trim();
      const money = parseMoneyText(raw);
      if (money.ok) {
        annual = money;
        recognisedLines.push({ label: 'Annual Salary', value: raw, line });
        handled = true;
      } else {
        exceptions.push({ field: 'budgeted_compensation', input: raw, reason: money.reason });
      }
    } else if (l.startsWith('Monthly:')) {
      const raw = l.replace('Monthly:', '').trim();
      const money = parseMoneyText(raw);
      if (money.ok) {
        monthly = money;
        recognisedLines.push({ label: 'Monthly', value: raw, line });
        handled = true;
      } else {
        exceptions.push({ field: 'budgeted_compensation', input: raw, reason: money.reason });
      }
    } else if (l.startsWith('Original Currency:')) {
      const raw = l.replace('Original Currency:', '').trim();
      if (/^[A-Za-z]{3}$/.test(raw)) {
        values.compensation_currency = raw.toUpperCase();
        recognisedLines.push({ label: 'Original Currency', value: raw, line });
        handled = true;
      } else {
        exceptions.push({ field: 'compensation_currency', input: raw, reason: 'not a three-letter currency code' });
      }
    } else if (l.startsWith('Planned Start:')) {
      const raw = l.replace('Planned Start:', '').trim();
      const month = parseMonthText(raw);
      if (month.ok) {
        values.target_start_month = month.isoDate;
        recognisedLines.push({ label: 'Planned Start', value: raw, line });
        handled = true;
      } else {
        exceptions.push({ field: 'target_start_month', input: raw, reason: month.reason });
      }
    } else if (l.startsWith('Priority:')) {
      const raw = l.replace('Priority:', '').trim();
      if (raw === 'None') {
        // The frontend writes 'Priority: None' for no priority. Recognised,
        // no value, no exception.
        recognisedLines.push({ label: 'Priority', value: raw, line });
        handled = true;
      } else if (/^[0-4]$/.test(raw)) {
        values.priority = Number(raw);
        recognisedLines.push({ label: 'Priority', value: raw, line });
        handled = true;
      } else {
        exceptions.push({ field: 'priority', input: raw, reason: 'priority must be an integer between 0 and 4, or None' });
      }
    } else if (l.startsWith('Recruitment Status:')) {
      // Derived state now - no structured column. Recognised only.
      const raw = l.replace('Recruitment Status:', '').trim();
      recognisedLines.push({ label: 'Recruitment Status', value: raw, line });
      handled = true;
    } else if (l.startsWith('Type: Contract')) {
      // The frontend only special-cases 'Type: Contract'; other Type: lines
      // stay in the narrative. Canonical value per migration 084.
      values.employment_type = 'contractor';
      recognisedLines.push({ label: 'Type', value: l.replace('Type:', '').trim(), line });
      handled = true;
    }

    if (!handled) keptLines.push(line);
  }

  // Compensation basis resolution. Both labels present is a conflict, not a
  // guess: no amount and no basis are written.
  if (annual && monthly) {
    exceptions.push({
      field: 'compensation_basis',
      input: `Annual Salary: ${annual.amount} / Monthly: ${monthly.amount}`,
      reason: 'conflict: both Annual Salary and Monthly present',
    });
  } else if (annual || monthly) {
    const money = annual || monthly;
    values.budgeted_compensation = money.amount;
    values.compensation_basis = annual ? 'annual' : 'monthly';

    // Conflict detection only: an explicit code inside the money text is
    // never a currency source, but if it contradicts the Original Currency
    // line the currency is suspect and must not be written.
    if (money.currencyCode && values.compensation_currency
        && money.currencyCode !== values.compensation_currency) {
      exceptions.push({
        field: 'compensation_currency',
        input: `${money.currencyCode} vs Original Currency ${values.compensation_currency}`,
        reason: 'conflict: money text code disagrees with Original Currency line',
      });
      delete values.compensation_currency;
    }
  }

  // Trim leading/trailing blank lines; preserve interior narrative structure.
  let start = 0;
  let end = keptLines.length;
  while (start < end && keptLines[start].trim() === '') start++;
  while (end > start && keptLines[end - 1].trim() === '') end--;
  const cleanDescription = keptLines.slice(start, end).join('\n');

  return { values, cleanDescription, recognisedLines, exceptions };
}

module.exports = {
  parseLegacyHiringDescription,
  parseMoneyText,
  parseMonthText,
};
