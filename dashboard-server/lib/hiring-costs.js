// dashboard-server/lib/hiring-costs.js
//
// Single authoritative cost engine for the Hiring Plan feature. The monthly
// cost API and the Excel export BOTH call this module, so the UI and the
// workbook can never disagree about a number.
//
// This module is PURE: no database access, no filesystem access, no Express.
// Inputs are plain objects shaped like hiring_positions rows after migration
// 084_hiring_plan.sql (pg returns NUMERIC columns as strings, DATE columns
// may arrive as Date objects) and hiring_client_settings rows.
//
// Cost model (approved design):
//
//   annual basis:  monthly base = annual budget / 12
//   monthly basis: monthly base = monthly budget
//   daily basis:   monthly base = daily rate * expected workdays per month
//
//   monthly GBP base     = monthly paid-currency base * stored FX rate to GBP
//   monthly GBP weighted = monthly GBP base * (1 + applied weighting pct / 100)
//
// Weighting (employer on-costs) applies to FTE roles ONLY: one blanket
// client percentage (fte_on_cost_pct), with a per-role override honoured
// for FTE roles. Contractors and PSCs are NEVER weighted - their fully
// weighted cost is their base cost. Legacy engagement spellings
// ('permanent', 'contract', 'freelance') map onto the canonical vocabulary.
//
// ALL arithmetic is done in integer minor units (pence / cents) via BigInt.
// NUMERIC(14,4) strings are parsed with an exact scaled-integer routine (a
// value with at most 4 decimal places converts exactly; parseFloat is never
// used on money). Rounding is HALF-UP at each boundary, in this order:
//
//   1. paid amount to paid-currency minor units (annual / 12 and
//      daily * workdays can produce fractions of a cent),
//   2. multiply by the FX rate and round at the GBP penny boundary,
//   3. multiply by (1 + on-cost / 100) and round at the penny boundary again.
//
// Half-up is the conventional commercial rounding mode and matches how the
// figures were quoted in the approved design. Because rounding happens at
// each boundary, no float ever drifts through chained multiplication.
//
// Incomplete-never-zero invariant: a role with missing or unparseable cost
// assumptions produces NULL cells (never zero) and lands in
// incompleteRoleIds. Totals show the subtotal that CAN be calculated (null
// cells are skipped, never treated as zero) with an explicit
// incomplete=true indicator on every total an incomplete role touches, per
// the approved design: the number is presented alongside the flag so an
// incomplete plan can never be mistaken for a complete, cheaper one.

'use strict';

// NUMERIC(14,4): four decimal places of storage scale.
const DECIMAL_SCALE = 4;
const SCALE_FACTOR = 10n ** BigInt(DECIMAL_SCALE); // 10000n

// Minor units per major unit. All permitted currencies (GBP and the
// two-decimal ISO currencies the settings admit) use 100.
const MINOR_PER_MAJOR = 100n;

// Weighting (employer on-costs: NI, pension) is an FTE-ONLY concept
// (Glen 2026-07-24): a contractor is paid their rate and nothing else, so a
// contractor's fully weighted cost IS their base cost. One blanket FTE
// percentage per client (fte_on_cost_pct). Legacy spellings map onto the
// canonical vocabulary. Never guess for unknown values.
const FTE_TYPES = new Set(['fte', 'permanent']);
const UNWEIGHTED_TYPES = new Set(['contractor', 'contract', 'psc', 'freelance']);

const VALID_BASES = new Set(['annual', 'monthly', 'daily']);
const VALID_HORIZONS = new Set([12, 24, 36]);

/**
 * Parse a non-negative decimal (NUMERIC string or number) into an exact
 * BigInt scaled by 10^4. Returns null for anything missing, negative,
 * non-finite, or with more than 4 decimal places. Never guesses.
 */
function parseScaledDecimal(value) {
  let text;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return null;
  }
  const match = text.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const frac = match[2] || '';
  if (frac.length > DECIMAL_SCALE) return null;
  const fracPadded = frac.padEnd(DECIMAL_SCALE, '0');
  return BigInt(match[1]) * SCALE_FACTOR + BigInt(fracPadded);
}

/**
 * Half-up integer division for non-negative BigInts.
 * floor((2n + d) / 2d) rounds n/d half-up.
 */
function divHalfUp(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

/**
 * Normalise a start date (pg Date object, 'YYYY-MM-DD' string, or ISO
 * timestamp string) to a 'YYYY-MM' month key. Returns null when the value
 * is missing or unrecognisable. Date objects are read via local-time
 * accessors because pg parses DATE columns to local midnight; strings are
 * read textually so no timezone arithmetic can shift the month.
 */
function monthKeyOf(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return `${match[1]}-${match[2]}`;
  }
  return null;
}

/**
 * Advance a 'YYYY-MM' month key by one calendar month.
 * '2026-03' -> '2026-04', '2026-12' -> '2027-01'. Returns null for bad input.
 */
function nextMonthKey(key) {
  if (typeof key !== 'string') return null;
  const match = key.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  let year = Number(match[1]);
  let month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  month += 1;
  if (month > 12) { month = 1; year += 1; }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Resolve the applied weighting percentage as a scaled BigInt (10^4).
 *
 *   contractor / psc (any spelling): ALWAYS 0 — contractors are never
 *     weighted, their cost is what they are paid. A stored per-role
 *     override on a contractor is ignored.
 *   fte / permanent: role override when present (zero is a valid
 *     override), else the client's blanket fte_on_cost_pct.
 *   unknown / missing engagement type: honour an explicit override, else
 *     null — we cannot know whether weighting applies.
 */
function resolveOnCostScaled(role, settings) {
  if (UNWEIGHTED_TYPES.has(role.employment_type)) return 0n;
  const override = role.on_cost_override_pct;
  if (override !== null && override !== undefined && override !== '') {
    return parseScaledDecimal(override);
  }
  if (!FTE_TYPES.has(role.employment_type)) return null;
  if (!settings || settings.fte_on_cost_pct === null || settings.fte_on_cost_pct === undefined) return null;
  return parseScaledDecimal(settings.fte_on_cost_pct);
}

/**
 * Calculate the monthly cost of one role in integer minor units.
 *
 * Returns { paidMinor, baseGbpPence, loadedGbpPence, onCostPct } for a role
 * with complete assumptions, or null when any assumption is missing or
 * unparseable. Callers must treat null as "incomplete", never as zero.
 */
function calculateMonthlyCost(role, settings) {
  if (!role) return null;

  // Zero compensation means "not set", not "free": the DB check requires
  // budgeted_compensation > 0 and the legacy parser rejects <= 0 amounts,
  // so a zero here is unset data and must read as incomplete, never cheap.
  const amountScaled = parseScaledDecimal(role.budgeted_compensation);
  if (amountScaled === null || amountScaled === 0n) return null;

  const basis = role.compensation_basis;
  if (!VALID_BASES.has(basis)) return null;

  // Step 1: monthly base in paid-currency minor units, rounded half-up at
  // the minor-unit boundary.
  let paidMinor;
  if (basis === 'annual') {
    // scaled(10^4) -> minor: / (SCALE_FACTOR / MINOR_PER_MAJOR); then / 12.
    paidMinor = divHalfUp(amountScaled, (SCALE_FACTOR / MINOR_PER_MAJOR) * 12n);
  } else if (basis === 'monthly') {
    paidMinor = divHalfUp(amountScaled, SCALE_FACTOR / MINOR_PER_MAJOR);
  } else {
    // Zero workdays likewise means "not set" (DB check requires > 0), so it
    // is incomplete rather than a zero-cost month.
    const workdaysScaled = parseScaledDecimal(role.expected_workdays_per_month);
    if (workdaysScaled === null || workdaysScaled === 0n) return null;
    // (10^4 * 10^4) -> minor: divide by 10^8 / 100 = 10^6.
    paidMinor = divHalfUp(amountScaled * workdaysScaled, (SCALE_FACTOR * SCALE_FACTOR) / MINOR_PER_MAJOR);
  }

  // Step 2: FX to GBP pence, rounded half-up at the penny boundary. GBP
  // uses a FIXED rate of 1 (design spec): any stored fx_rate_to_gbp on a
  // GBP role is legacy noise and is ignored, so a bad row can never
  // mis-price a GBP role. Every other currency requires the stored rate.
  const currency = typeof role.compensation_currency === 'string'
    ? role.compensation_currency.trim().toUpperCase()
    : null;
  if (!currency) return null;
  let fxScaled;
  if (currency === 'GBP') {
    fxScaled = SCALE_FACTOR;
  } else if (role.fx_rate_to_gbp !== null && role.fx_rate_to_gbp !== undefined && role.fx_rate_to_gbp !== '') {
    fxScaled = parseScaledDecimal(role.fx_rate_to_gbp);
    if (fxScaled === null || fxScaled === 0n) return null;
  } else {
    return null;
  }
  const baseGbpPence = divHalfUp(paidMinor * fxScaled, SCALE_FACTOR);

  // Step 3: on-cost applied to the penny-rounded base, rounded half-up at
  // the penny boundary again. An unresolvable on-cost is NOT fatal (Glen's
  // correction 2026-07-24): the base cost is fully determined by steps 1-2,
  // so only the loaded figure goes null. Callers must treat a null
  // loadedGbpPence as "on-cost not set", never as zero.
  const onCostScaled = resolveOnCostScaled(role, settings);
  let loadedGbpPence = null;
  if (onCostScaled !== null) {
    // (1 + pct/100) = (100 * 10^4 + pctScaled) / (100 * 10^4)
    const onCostDenominator = MINOR_PER_MAJOR * SCALE_FACTOR;
    loadedGbpPence = divHalfUp(baseGbpPence * (onCostDenominator + onCostScaled), onCostDenominator);
  }

  return {
    paidMinor: Number(paidMinor),
    baseGbpPence: Number(baseGbpPence),
    loadedGbpPence: loadedGbpPence === null ? null : Number(loadedGbpPence),
    onCostPct: onCostScaled === null ? null : Number(onCostScaled) / Number(SCALE_FACTOR),
  };
}

/**
 * Build the plan horizon as an array of 'YYYY-MM' month keys using pure
 * year/month arithmetic (no Date objects, so no timezone can shift a month).
 *
 * startMonth: ISO first-of-month date string, e.g. '2026-04-01'.
 * months: 12, 24 or 36.
 */
function buildMonthHorizon(startMonth, months) {
  if (!VALID_HORIZONS.has(months)) {
    throw new Error(`horizon must be 12, 24 or 36 months, got ${JSON.stringify(months)}`);
  }
  const match = typeof startMonth === 'string' ? startMonth.match(/^(\d{4})-(\d{2})-01$/) : null;
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    throw new Error(`startMonth must be an ISO first-of-month date string (YYYY-MM-01), got ${JSON.stringify(startMonth)}`);
  }
  const startYear = Number(match[1]);
  const startMonthIndex = Number(match[2]) - 1; // zero-based
  const keys = [];
  for (let i = 0; i < months; i++) {
    const total = startYear * 12 + startMonthIndex + i;
    const year = Math.floor(total / 12);
    const month = (total % 12) + 1;
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return keys;
}

/**
 * Derive the role's planning state.
 *
 *   excluded: denied roles, and closed roles shut down. Contribute zero.
 *   hired:    closed roles filled. Continue as planned headcount from the
 *             candidate's actual start month when available, else the
 *             target start month.
 *   planned:  everything else (approved and pending both count).
 */
function deriveRoleState(role) {
  if (role.approval_status === 'denied') return 'excluded';
  if (role.status === 'closed') {
    if (role.closed_reason === 'shut_down') return 'excluded';
    if (role.closed_reason === 'filled') return 'hired';
  }
  return 'planned';
}

/**
 * Diagnose WHICH cost inputs stop a role being costed. Returns an array of
 * reason codes in upstream-first order: missing_salary, missing_basis,
 * missing_workdays, missing_currency, missing_fx_rate,
 * missing_on_cost_default. Empty when calculateMonthlyCost would succeed.
 *
 * This exists so the UI can say precisely why a row shows dashes. Before it,
 * every incomplete row was labelled "no salary on record", which was false
 * whenever the missing input was the client's on-cost default (the entire
 * Couch Heroes plan, 2026-07-24) or an FX rate.
 */
function diagnoseCostInputs(role, settings) {
  const reasons = [];

  const amountScaled = parseScaledDecimal(role.budgeted_compensation);
  if (amountScaled === null || amountScaled === 0n) reasons.push('missing_salary');

  const basis = role.compensation_basis;
  if (!VALID_BASES.has(basis)) {
    reasons.push('missing_basis');
  } else if (basis === 'daily') {
    const workdaysScaled = parseScaledDecimal(role.expected_workdays_per_month);
    if (workdaysScaled === null || workdaysScaled === 0n) reasons.push('missing_workdays');
  }

  const currency = typeof role.compensation_currency === 'string'
    ? role.compensation_currency.trim().toUpperCase()
    : null;
  if (!currency) {
    reasons.push('missing_currency');
  } else if (currency !== 'GBP') {
    const fxScaled = (role.fx_rate_to_gbp !== null && role.fx_rate_to_gbp !== undefined && role.fx_rate_to_gbp !== '')
      ? parseScaledDecimal(role.fx_rate_to_gbp)
      : null;
    if (fxScaled === null || fxScaled === 0n) reasons.push('missing_fx_rate');
  }

  if (resolveOnCostScaled(role, settings) === null) {
    // FTE without the blanket % set vs a role whose engagement type is
    // unknown: different fixes (Settings vs the role record), so different
    // codes. Contractors never reach here (weighting is always 0).
    reasons.push(FTE_TYPES.has(role.employment_type) ? 'missing_on_cost_default' : 'missing_engagement_type');
  }

  return reasons;
}

/**
 * Build one role's cost cells across a months array of 'YYYY-MM' keys.
 *
 * Cell semantics:
 *   - excluded roles: every cell 0, incomplete false (their assumptions are
 *     irrelevant; they contribute nothing by definition);
 *   - months before the start month: 0 (known-zero, even for roles whose
 *     cost assumptions are incomplete);
 *   - months from the start month with complete assumptions: the cost;
 *   - months from the start month with incomplete assumptions: null;
 *   - unknown start month (active role): every cell null.
 *
 * incomplete is true exactly when the row contains a null cell, so a role
 * whose start month lies beyond the horizon contributes zeros and is not
 * flagged (it cannot understate this horizon's totals).
 */
function buildRoleCostRow(role, settings, months) {
  const state = deriveRoleState(role);
  const base = new Array(months.length).fill(0);
  const loaded = new Array(months.length).fill(0);

  if (state === 'excluded') {
    return {
      role_id: role.id !== undefined ? role.id : null,
      state,
      excluded: true,
      incomplete: false,
      incomplete_reasons: [],
      start_month: monthKeyOf(role.target_start_month),
      paid_minor: null,
      monthly_base_gbp_pence: null,
      monthly_loaded_gbp_pence: null,
      on_cost_pct: null,
      base_gbp_pence: base,
      loaded_gbp_pence: loaded,
    };
  }

  if (state === 'planned') {
    // Glen 2026-07-24: unfilled roles contribute zero until someone is
    // actually hired. The per-unit cost is still computed so the detail
    // view can show "will cost £X/mo once filled."
    const cost = calculateMonthlyCost(role, settings);
    return {
      role_id: role.id !== undefined ? role.id : null,
      state,
      excluded: false,
      incomplete: false,
      incomplete_reasons: [],
      start_month: monthKeyOf(role.target_start_month),
      paid_minor: cost ? cost.paidMinor : null,
      monthly_base_gbp_pence: cost ? cost.baseGbpPence : null,
      monthly_loaded_gbp_pence: cost ? cost.loadedGbpPence : null,
      on_cost_pct: cost ? cost.onCostPct : null,
      base_gbp_pence: base,
      loaded_gbp_pence: loaded,
    };
  }

  // state === 'hired': costs start the month AFTER the start date (first
  // payday, not first day on the job). Glen 2026-07-24.
  const targetKey = monthKeyOf(role.target_start_month);
  const rawStartKey = monthKeyOf(role.actual_start_date) || targetKey;
  const startKey = rawStartKey ? nextMonthKey(rawStartKey) : null;
  const cost = calculateMonthlyCost(role, settings);

  let incomplete = false;
  for (let i = 0; i < months.length; i++) {
    if (startKey === null) {
      base[i] = null;
      loaded[i] = null;
      incomplete = true;
    } else if (months[i] < startKey) {
      base[i] = 0;
      loaded[i] = 0;
    } else if (cost === null) {
      base[i] = null;
      loaded[i] = null;
      incomplete = true;
    } else {
      base[i] = cost.baseGbpPence;
      if (cost.loadedGbpPence === null) {
        loaded[i] = null;
        incomplete = true;
      } else {
        loaded[i] = cost.loadedGbpPence;
      }
    }
  }

  const incompleteReasons = [];
  if (incomplete) {
    if (startKey === null) incompleteReasons.push('missing_start_month');
    incompleteReasons.push(...diagnoseCostInputs(role, settings));
  }

  return {
    role_id: role.id !== undefined ? role.id : null,
    state,
    excluded: false,
    incomplete,
    incomplete_reasons: incompleteReasons,
    start_month: startKey,
    paid_minor: cost ? cost.paidMinor : null,
    monthly_base_gbp_pence: cost ? cost.baseGbpPence : null,
    monthly_loaded_gbp_pence: cost ? cost.loadedGbpPence : null,
    on_cost_pct: cost ? cost.onCostPct : null,
    base_gbp_pence: base,
    loaded_gbp_pence: loaded,
  };
}

// A totals accumulator. Null cells are SKIPPED while accumulating, so every
// total remains the subtotal that can be calculated; they additionally set
// incomplete=true so the caller always presents the number with an explicit
// incomplete indicator (design spec: "show the subtotal that can be
// calculated and an explicit incomplete indicator").
function makeTotals(length) {
  return {
    base_gbp_pence: new Array(length).fill(0),
    loaded_gbp_pence: new Array(length).fill(0),
    // Base contributions from cells whose LOADED figure is unset (on-cost
    // missing). Lets the UI present "loaded + base-only" as an explicit
    // "at least" figure instead of a blank, without ever conflating it
    // with a true loaded total.
    base_only_gbp_pence: new Array(length).fill(0),
    horizon_base_gbp_pence: 0,
    horizon_loaded_gbp_pence: 0,
    horizon_base_only_gbp_pence: 0,
    incomplete: false,
  };
}

function addRowToTotals(totals, row) {
  // Base and loaded accumulate independently: a missing on-cost default
  // nulls only the loaded cell while the base cell still carries real cost.
  for (let i = 0; i < row.base_gbp_pence.length; i++) {
    const baseCell = row.base_gbp_pence[i];
    const loadedCell = row.loaded_gbp_pence[i];
    if (baseCell === null) {
      totals.incomplete = true;
    } else {
      totals.base_gbp_pence[i] += baseCell;
      totals.horizon_base_gbp_pence += baseCell;
    }
    if (loadedCell === null) {
      totals.incomplete = true;
      if (baseCell !== null) {
        totals.base_only_gbp_pence[i] += baseCell;
        totals.horizon_base_only_gbp_pence += baseCell;
      }
    } else {
      totals.loaded_gbp_pence[i] += loadedCell;
      totals.horizon_loaded_gbp_pence += loadedCell;
    }
  }
}

/**
 * Build the full cost matrix for a set of roles.
 *
 * Returns { months, rows, totals, incompleteRoleIds } where rows follow the
 * default sort order and totals has approved, pending and combined buckets.
 * Denied roles appear in rows (all zeros) but belong to no totals bucket.
 * The hired/planned distinction does not move a role between buckets: a
 * filled role still counts under its approval status as planned headcount.
 */
function buildCostMatrix(roles, settings, { startMonth, months }) {
  const horizon = buildMonthHorizon(startMonth, months);
  const sorted = sortHiringRoles(roles);

  const totals = {
    approved: makeTotals(horizon.length),
    pending: makeTotals(horizon.length),
    combined: makeTotals(horizon.length),
  };
  const rows = [];
  const incompleteRoleIds = [];

  for (const role of sorted) {
    const row = buildRoleCostRow(role, settings, horizon);
    rows.push(row);
    if (row.incomplete) incompleteRoleIds.push(row.role_id);

    const bucket = role.approval_status === 'approved' ? 'approved'
      : role.approval_status === 'pending' ? 'pending'
        : null;
    if (bucket) {
      addRowToTotals(totals[bucket], row);
      addRowToTotals(totals.combined, row);
    }
  }

  return { months: horizon, rows, totals, incompleteRoleIds };
}

// Sort comparators: nulls always last within their tier.
function compareNullable(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function numericPriorityOf(role) {
  const p = role.priority;
  if (p === null || p === undefined || p === '') return null;
  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}

/**
 * Default sort: target_start_month ascending with null start months LAST,
 * then numeric priority ascending (null priority last), then title
 * alphabetically. Returns a new array; the input is not mutated.
 */
function sortHiringRoles(roles) {
  return roles.slice().sort((a, b) => {
    const byMonth = compareNullable(monthKeyOf(a.target_start_month), monthKeyOf(b.target_start_month));
    if (byMonth !== 0) return byMonth;
    const byPriority = compareNullable(numericPriorityOf(a), numericPriorityOf(b));
    if (byPriority !== 0) return byPriority;
    const titleA = typeof a.title === 'string' ? a.title : '';
    const titleB = typeof b.title === 'string' ? b.title : '';
    return titleA.localeCompare(titleB, 'en', { sensitivity: 'base' });
  });
}

/**
 * Format integer pence as a GBP display string for response boundaries,
 * e.g. 123456 -> '£1,234.56'. Null and undefined pass through as null so
 * incomplete cells stay visibly empty rather than becoming £0.00.
 */
function moneyFromPence(pence) {
  if (pence === null || pence === undefined) return null;
  if (typeof pence !== 'number' || !Number.isFinite(pence)) return null;
  const sign = pence < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(pence));
  const pounds = Math.floor(absolute / 100);
  const remainder = String(absolute % 100).padStart(2, '0');
  const grouped = String(pounds).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}£${grouped}.${remainder}`;
}

module.exports = {
  calculateMonthlyCost,
  diagnoseCostInputs,
  buildMonthHorizon,
  buildRoleCostRow,
  buildCostMatrix,
  sortHiringRoles,
  moneyFromPence,
  monthKeyOf,
  nextMonthKey,
};
