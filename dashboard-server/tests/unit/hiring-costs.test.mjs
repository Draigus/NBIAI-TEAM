// dashboard-server/tests/unit/hiring-costs.test.mjs
//
// Unit tests for lib/hiring-costs.js, the single authoritative cost engine
// for the Hiring Plan feature. The monthly cost API and the Excel export both
// call this module, so the semantics pinned here are the semantics of the
// whole feature: integer minor-unit arithmetic, half-up rounding at penny
// boundaries, FX before on-cost, incomplete-never-zero, and the default
// sort order.
//
// Inputs are plain objects shaped like hiring_positions rows after migration
// 084 (pg returns NUMERIC as strings, DATE columns may arrive as Date
// objects) and hiring_client_settings rows.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  calculateMonthlyCost,
  buildMonthHorizon,
  buildRoleCostRow,
  buildCostMatrix,
  sortHiringRoles,
  moneyFromPence,
  monthKeyOf,
  nextMonthKey,
} = require('../../lib/hiring-costs.js');

// Baseline settings row: NUMERIC strings as pg returns them.
const SETTINGS = {
  fte_on_cost_pct: '10.0000',
  contractor_on_cost_pct: '15.0000',
  psc_on_cost_pct: '2.0000',
};

// Planned (unfilled) role baseline. 60000 annual = 5000/month = 500000
// pence base, 550000 pence loaded at the 10% FTE default.
function makeRole(overrides = {}) {
  return {
    id: 'role-a',
    title: 'Engineer',
    status: 'open',
    closed_reason: null,
    approval_status: 'approved',
    target_start_month: '2026-02-01',
    actual_start_date: null,
    budgeted_compensation: '60000.0000',
    compensation_basis: 'annual',
    compensation_currency: 'GBP',
    fx_rate_to_gbp: null,
    expected_workdays_per_month: null,
    on_cost_override_pct: null,
    employment_type: 'fte',
    priority: 1,
    ...overrides,
  };
}

// Hired (filled) role. Same cost profile as makeRole but status=closed/filled,
// so the cost engine applies the first-payment-delay and fills cells.
function makeHiredRole(overrides = {}) {
  return makeRole({ status: 'closed', closed_reason: 'filled', ...overrides });
}

describe('calculateMonthlyCost', () => {
  it('PSC daily cost is never weighted: weighted equals base, override ignored', () => {
    const result = calculateMonthlyCost({
      budgeted_compensation: '500',
      compensation_basis: 'daily',
      expected_workdays_per_month: '18',
      compensation_currency: 'EUR',
      fx_rate_to_gbp: '0.86',
      on_cost_override_pct: '5',
      employment_type: 'psc'
    }, { fte_on_cost_pct: '26' });
    expect(result).toEqual({
      paidMinor: 900000,
      baseGbpPence: 774000,
      loadedGbpPence: 774000,
      onCostPct: 0
    });
  });

  it('calculates annual GBP cost with the client FTE default on-cost', () => {
    const result = calculateMonthlyCost({
      budgeted_compensation: '96000.0000',
      compensation_basis: 'annual',
      compensation_currency: 'GBP',
      employment_type: 'fte',
    }, { fte_on_cost_pct: '13.8000' });
    expect(result).toEqual({
      paidMinor: 800000,
      baseGbpPence: 800000,
      loadedGbpPence: 910400,
      onCostPct: 13.8,
    });
  });

  it('contractor monthly non-GBP cost uses the stored FX rate and is never weighted', () => {
    const result = calculateMonthlyCost({
      budgeted_compensation: '3500.0000',
      compensation_basis: 'monthly',
      compensation_currency: 'EUR',
      fx_rate_to_gbp: '0.8600',
      employment_type: 'contractor',
    }, SETTINGS);
    expect(result).toEqual({
      paidMinor: 350000,
      baseGbpPence: 301000,
      loadedGbpPence: 301000,
      onCostPct: 0,
    });
  });

  it('parses NUMERIC strings with trailing zeros identically to bare values', () => {
    const result = calculateMonthlyCost({
      budgeted_compensation: '500.0000',
      compensation_basis: 'daily',
      expected_workdays_per_month: '18.0000',
      compensation_currency: 'EUR',
      fx_rate_to_gbp: '0.8600',
      on_cost_override_pct: '5.0000',
      employment_type: 'fte',
    }, SETTINGS);
    expect(result).toEqual({
      paidMinor: 900000,
      baseGbpPence: 774000,
      loadedGbpPence: 812700,
      onCostPct: 5,
    });
  });

  describe('weighting is FTE-only across legacy spellings', () => {
    it("'permanent' weights with the blanket FTE %", () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '4000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        employment_type: 'permanent',
      }, SETTINGS);
      expect(result).toEqual({
        paidMinor: 400000,
        baseGbpPence: 400000,
        loadedGbpPence: 440000,
        onCostPct: 10,
      });
    });

    it("'contract' is never weighted", () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '4000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        employment_type: 'contract',
      }, SETTINGS);
      expect(result.onCostPct).toBe(0);
      expect(result.loadedGbpPence).toBe(400000);
    });

    it("'freelance' is never weighted", () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '400',
        compensation_basis: 'daily',
        expected_workdays_per_month: '20',
        compensation_currency: 'GBP',
        employment_type: 'freelance',
      }, SETTINGS);
      expect(result).toEqual({
        paidMinor: 800000,
        baseGbpPence: 800000,
        loadedGbpPence: 800000,
        onCostPct: 0,
      });
    });
  });

  describe('rounding', () => {
    it('rounds a non-divisible annual budget half-up at the minor-unit boundary', () => {
      // 100000 / 12 = 8333.3333... per month = 833333.33 minor, rounds to 833333.
      const result = calculateMonthlyCost({
        budgeted_compensation: '100000',
        compensation_basis: 'annual',
        compensation_currency: 'GBP',
        employment_type: 'fte',
      }, { fte_on_cost_pct: '0' });
      expect(result).toEqual({
        paidMinor: 833333,
        baseGbpPence: 833333,
        loadedGbpPence: 833333,
        onCostPct: 0,
      });
    });

    it('rounds half-up at the penny boundary after FX', () => {
      // 100 cents * 0.8650 = 86.5 pence, half-up to 87.
      const result = calculateMonthlyCost({
        budgeted_compensation: '1.00',
        compensation_basis: 'monthly',
        compensation_currency: 'EUR',
        fx_rate_to_gbp: '0.8650',
        employment_type: 'fte',
      }, { fte_on_cost_pct: '0' });
      expect(result.paidMinor).toBe(100);
      expect(result.baseGbpPence).toBe(87);
      expect(result.loadedGbpPence).toBe(87);
    });

    it('rounds half-up at the penny boundary after on-cost', () => {
      // 100 pence * 1.005 = 100.5, half-up to 101.
      const result = calculateMonthlyCost({
        budgeted_compensation: '1.00',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        on_cost_override_pct: '0.5',
        employment_type: 'fte',
      }, SETTINGS);
      expect(result.baseGbpPence).toBe(100);
      expect(result.loadedGbpPence).toBe(101);
    });

    it('applies on-cost to the penny-rounded GBP base, not the raw FX product', () => {
      // Raw: 100 * 0.8650 = 86.5; 86.5 * 1.10 = 95.15 which would round to 95.
      // Correct order: 86.5 rounds to 87 first; 87 * 1.10 = 95.7 rounds to 96.
      const result = calculateMonthlyCost({
        budgeted_compensation: '1.00',
        compensation_basis: 'monthly',
        compensation_currency: 'EUR',
        fx_rate_to_gbp: '0.8650',
        on_cost_override_pct: '10',
        employment_type: 'fte',
      }, SETTINGS);
      expect(result.baseGbpPence).toBe(87);
      expect(result.loadedGbpPence).toBe(96);
    });
  });

  describe('weighting resolution', () => {
    it('an FTE zero override wins over a non-zero client blanket %', () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '1000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        on_cost_override_pct: '0',
        employment_type: 'fte',
      }, SETTINGS);
      expect(result.onCostPct).toBe(0);
      expect(result.loadedGbpPence).toBe(result.baseGbpPence);
    });

    it('a zero client blanket % is complete, not incomplete', () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '1000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        employment_type: 'fte',
      }, { fte_on_cost_pct: '0.0000' });
      expect(result).toEqual({
        paidMinor: 100000,
        baseGbpPence: 100000,
        loadedGbpPence: 100000,
        onCostPct: 0,
      });
    });

    it('an override still resolves when employment_type is missing', () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '1000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        on_cost_override_pct: '7.5',
        employment_type: null,
      }, SETTINGS);
      expect(result.onCostPct).toBe(7.5);
    });

    it('a contractor override is ignored: contractors are never weighted', () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '1000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        on_cost_override_pct: '15',
        employment_type: 'contractor',
      }, SETTINGS);
      expect(result.onCostPct).toBe(0);
      expect(result.loadedGbpPence).toBe(result.baseGbpPence);
    });
  });

  describe('missing or invalid assumptions return null, never zero', () => {
    const cases = [
      ['missing budgeted_compensation', { budgeted_compensation: null }, SETTINGS],
      ['unparseable budgeted_compensation', { budgeted_compensation: 'circa 60k' }, SETTINGS],
      ['negative budgeted_compensation', { budgeted_compensation: '-60000' }, SETTINGS],
      ['missing compensation_basis', { compensation_basis: null }, SETTINGS],
      ['unknown compensation_basis', { compensation_basis: 'weekly' }, SETTINGS],
      ['daily basis without workdays', {
        compensation_basis: 'daily', expected_workdays_per_month: null,
      }, SETTINGS],
      ['missing compensation_currency', { compensation_currency: null }, SETTINGS],
      ['non-GBP currency without an FX rate', {
        compensation_currency: 'EUR', fx_rate_to_gbp: null,
      }, SETTINGS],
    ];
    for (const [name, overrides, settings] of cases) {
      it(name, () => {
        expect(calculateMonthlyCost(makeRole(overrides), settings)).toBeNull();
      });
    }
  });

  // Glen's correction 2026-07-24: an unresolvable on-cost must NOT wipe out
  // the base cost that salary + basis + FX already determine. Base always
  // computes when its own inputs exist; only the loaded figure is null.
  describe('on-cost unresolvable: base still computes, loaded is null', () => {
    const cases = [
      ['no override and unknown employment_type', { employment_type: 'llama' }, SETTINGS],
      ['no override and missing employment_type', { employment_type: null }, SETTINGS],
      ['no override and no settings row', {}, null],
      ['no override and settings row missing the pct', {}, {}],
      ['unparseable on_cost_override_pct', { on_cost_override_pct: 'n/a' }, SETTINGS],
    ];
    for (const [name, overrides, settings] of cases) {
      it(name, () => {
        expect(calculateMonthlyCost(makeRole(overrides), settings)).toEqual({
          paidMinor: 500000,
          baseGbpPence: 500000,
          loadedGbpPence: null,
          onCostPct: null,
        });
      });
    }

    it('GBP without an FX rate is complete (fixed rate of 1)', () => {
      expect(calculateMonthlyCost(makeRole(), SETTINGS)).toEqual({
        paidMinor: 500000,
        baseGbpPence: 500000,
        loadedGbpPence: 550000,
        onCostPct: 10,
      });
    });

    it('accepts number-typed compensation and override values', () => {
      // pg returns NUMERIC as strings, but callers assembling test fixtures
      // or derived rows may pass plain numbers; both must agree exactly.
      const result = calculateMonthlyCost({
        budgeted_compensation: 500,
        compensation_basis: 'daily',
        expected_workdays_per_month: 18,
        compensation_currency: 'EUR',
        fx_rate_to_gbp: 0.86,
        on_cost_override_pct: 5,
        employment_type: 'fte',
      }, { fte_on_cost_pct: 26 });
      expect(result).toEqual({
        paidMinor: 900000,
        baseGbpPence: 774000,
        loadedGbpPence: 812700,
        onCostPct: 5,
      });
    });

    it('GBP ignores a stored FX rate: the rate is fixed at 1', () => {
      // A bad legacy row with a stored non-1 rate must not mis-price a GBP role.
      const result = calculateMonthlyCost(makeRole({
        budgeted_compensation: '1000',
        compensation_basis: 'monthly',
        fx_rate_to_gbp: '0.9000',
      }), SETTINGS);
      expect(result).toEqual({
        paidMinor: 100000,
        baseGbpPence: 100000,
        loadedGbpPence: 110000,
        onCostPct: 10,
      });
    });
  });
});

describe('buildMonthHorizon', () => {
  it('builds 12 months across a year boundary with pure y/m arithmetic', () => {
    const months = buildMonthHorizon('2026-04-01', 12);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-04');
    expect(months[8]).toBe('2026-12');
    expect(months[9]).toBe('2027-01');
    expect(months[11]).toBe('2027-03');
  });

  it('builds a 36-month horizon', () => {
    const months = buildMonthHorizon('2026-01-01', 36);
    expect(months).toHaveLength(36);
    expect(months[0]).toBe('2026-01');
    expect(months[35]).toBe('2028-12');
  });

  it('does not shift January under timezone-sensitive date handling', () => {
    expect(buildMonthHorizon('2026-01-01', 12)[0]).toBe('2026-01');
  });

  it('rejects horizon lengths other than 12, 24 or 36', () => {
    for (const bad of [0, 6, 13, 48, '12', null, undefined]) {
      expect(() => buildMonthHorizon('2026-01-01', bad)).toThrow(/12, 24 or 36/);
    }
  });

  it('rejects start dates that are not ISO first-of-month strings', () => {
    for (const bad of ['2026-04-15', '2026-13-01', '2026-00-01', 'April 2026', '', null, undefined, new Date()]) {
      expect(() => buildMonthHorizon(bad, 12)).toThrow(/first-of-month/);
    }
  });
});

describe('buildRoleCostRow', () => {
  const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04'];

  describe('planned (unfilled) roles contribute zero', () => {
    it('planned role: all cells zero regardless of target start', () => {
      const row = buildRoleCostRow(makeRole(), SETTINGS, MONTHS);
      expect(row.base_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.incomplete).toBe(false);
      expect(row.excluded).toBe(false);
      expect(row.state).toBe('planned');
      expect(row.start_month).toBe('2026-02');
      expect(row.monthly_base_gbp_pence).toBe(500000);
      expect(row.monthly_loaded_gbp_pence).toBe(550000);
      expect(row.on_cost_pct).toBe(10);
    });

    it('pending planned role: still zero', () => {
      const row = buildRoleCostRow(makeRole({ approval_status: 'pending' }), SETTINGS, MONTHS);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.state).toBe('planned');
    });

    it('planned role starting before the horizon: still zero', () => {
      const row = buildRoleCostRow(makeRole({ target_start_month: '2025-06-01' }), SETTINGS, MONTHS);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
    });

    it('paused role: planned, zero', () => {
      const row = buildRoleCostRow(makeRole({ status: 'paused' }), SETTINGS, MONTHS);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.state).toBe('planned');
    });

    it('planned role with missing assumptions: still zero and not incomplete', () => {
      const row = buildRoleCostRow(
        makeRole({ compensation_currency: 'EUR', fx_rate_to_gbp: null }),
        SETTINGS, MONTHS
      );
      expect(row.base_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.incomplete).toBe(false);
    });

    it('planned role with no start month: zero (not null)', () => {
      const row = buildRoleCostRow(makeRole({ target_start_month: null }), SETTINGS, MONTHS);
      expect(row.base_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.incomplete).toBe(false);
    });
  });

  describe('hired roles: first-payment-month delay', () => {
    it('costs start one month after the target start (first payday)', () => {
      const row = buildRoleCostRow(makeHiredRole(), SETTINGS, MONTHS);
      // target Feb → first payment March
      expect(row.base_gbp_pence).toEqual([0, 0, 500000, 500000]);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 550000, 550000]);
      expect(row.incomplete).toBe(false);
      expect(row.excluded).toBe(false);
      expect(row.state).toBe('hired');
      expect(row.start_month).toBe('2026-03');
      expect(row.paid_minor).toBe(500000);
      expect(row.monthly_base_gbp_pence).toBe(500000);
      expect(row.monthly_loaded_gbp_pence).toBe(550000);
      expect(row.on_cost_pct).toBe(10);
    });

    it('uses actual start when available, still with one-month delay', () => {
      const row = buildRoleCostRow(
        makeHiredRole({
          target_start_month: '2026-02-01',
          actual_start_date: '2026-03-15',
        }),
        SETTINGS, MONTHS
      );
      // actual March → first payment April
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 550000]);
    });

    it('falls back to target start without an actual start', () => {
      const row = buildRoleCostRow(makeHiredRole(), SETTINGS, MONTHS);
      // target Feb → first payment March
      expect(row.loaded_gbp_pence).toEqual([0, 0, 550000, 550000]);
    });

    it('accepts pg Date objects for start dates', () => {
      const row = buildRoleCostRow(
        makeHiredRole({
          target_start_month: new Date(2026, 1, 1),
          actual_start_date: new Date(2026, 2, 1),
        }),
        SETTINGS, MONTHS
      );
      // actual March → first payment April
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 550000]);
    });

    it('costs every month when first payment is before the horizon', () => {
      const row = buildRoleCostRow(
        makeHiredRole({ target_start_month: '2025-06-01' }),
        SETTINGS, MONTHS
      );
      // target June 2025 → first payment July 2025 → all months in 2026 covered
      expect(row.loaded_gbp_pence).toEqual([550000, 550000, 550000, 550000]);
    });

    it('incomplete assumptions produce null cells from the first payment month', () => {
      const row = buildRoleCostRow(
        makeHiredRole({ compensation_currency: 'EUR', fx_rate_to_gbp: null }),
        SETTINGS, MONTHS
      );
      // target Feb → first payment March
      expect(row.base_gbp_pence).toEqual([0, 0, null, null]);
      expect(row.loaded_gbp_pence).toEqual([0, 0, null, null]);
      expect(row.incomplete).toBe(true);
    });

    it('a missing start month on a hired role makes every cell null', () => {
      const row = buildRoleCostRow(
        makeHiredRole({ target_start_month: null }),
        SETTINGS, MONTHS
      );
      expect(row.base_gbp_pence).toEqual([null, null, null, null]);
      expect(row.loaded_gbp_pence).toEqual([null, null, null, null]);
      expect(row.incomplete).toBe(true);
    });

    it('hired role starting after the horizon contributes zero and is not incomplete', () => {
      const row = buildRoleCostRow(
        makeHiredRole({ target_start_month: '2027-01-01', compensation_currency: 'EUR', fx_rate_to_gbp: null }),
        SETTINGS, MONTHS
      );
      // target Jan 2027 → first payment Feb 2027 → beyond horizon
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.incomplete).toBe(false);
    });
  });

  describe('excluded roles', () => {
    it('denied roles contribute zero even with complete assumptions', () => {
      const row = buildRoleCostRow(makeRole({ approval_status: 'denied' }), SETTINGS, MONTHS);
      expect(row.base_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.excluded).toBe(true);
      expect(row.incomplete).toBe(false);
      expect(row.start_month).toBe('2026-02');
    });

    it('denied roles with missing assumptions are still zero, not incomplete', () => {
      const row = buildRoleCostRow(
        makeRole({ approval_status: 'denied', budgeted_compensation: null }),
        SETTINGS, MONTHS
      );
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.incomplete).toBe(false);
    });

    it('shut-down roles contribute zero', () => {
      const row = buildRoleCostRow(
        makeRole({ status: 'closed', closed_reason: 'shut_down' }),
        SETTINGS, MONTHS
      );
      expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
      expect(row.excluded).toBe(true);
    });
  });
});

describe('buildCostMatrix', () => {
  const settings = SETTINGS;

  // B is the only HIRED role in this fixture. A, C, E are planned (open) → zero.
  // B: actual start Jan 10 → first payment Feb. 2000 monthly = 200000 base, 220000 loaded.
  const roles = [
    makeRole({ id: 'A', title: 'Alpha', target_start_month: '2026-02-01', priority: 1 }),
    makeHiredRole({
      id: 'B', title: 'Bravo',
      target_start_month: '2026-03-01', actual_start_date: '2026-01-10',
      budgeted_compensation: '2000', compensation_basis: 'monthly', priority: 0,
    }),
    makeRole({
      id: 'C', title: 'Charlie', approval_status: 'pending',
      target_start_month: '2026-01-01', budgeted_compensation: '100',
      compensation_basis: 'daily', expected_workdays_per_month: '10',
      employment_type: 'psc', priority: 2,
    }),
    makeRole({ id: 'D', title: 'Delta', approval_status: 'denied', target_start_month: null }),
    makeRole({
      id: 'E', title: 'Echo', approval_status: 'pending',
      target_start_month: '2026-02-01', compensation_currency: 'EUR',
      fx_rate_to_gbp: null, priority: 0,
    }),
  ];

  it('returns months, sorted rows, totals and incompleteRoleIds', () => {
    const matrix = buildCostMatrix(roles, settings, { startMonth: '2026-01-01', months: 12 });
    expect(matrix.months).toHaveLength(12);
    expect(matrix.months[0]).toBe('2026-01');
    // Sort: C Jan; E then A in Feb by priority; B Mar; D null last.
    expect(matrix.rows.map((r) => r.role_id)).toEqual(['C', 'E', 'A', 'B', 'D']);
    // Planned roles are not incomplete (all zeros). No hired role has missing inputs.
    expect(matrix.incompleteRoleIds).toEqual([]);
  });

  it('totals only hired roles (planned contribute zero)', () => {
    const { totals } = buildCostMatrix(roles, settings, { startMonth: '2026-01-01', months: 12 });
    // Only B is hired: actual Jan 10 → first payment Feb. 200000 base/mo, 220000 loaded/mo.
    expect(totals.approved.base_gbp_pence[0]).toBe(0);       // Jan: before first payment
    expect(totals.approved.base_gbp_pence[1]).toBe(200000);  // Feb onwards
    expect(totals.approved.base_gbp_pence[11]).toBe(200000);
    expect(totals.approved.loaded_gbp_pence[0]).toBe(0);
    expect(totals.approved.loaded_gbp_pence[1]).toBe(220000);
    expect(totals.approved.horizon_base_gbp_pence).toBe(200000 * 11);
    expect(totals.approved.horizon_loaded_gbp_pence).toBe(220000 * 11);
    expect(totals.approved.incomplete).toBe(false);
  });

  it('planned roles contribute zero to pending and combined totals', () => {
    const { totals } = buildCostMatrix(roles, settings, { startMonth: '2026-01-01', months: 12 });
    // C and E are planned → zero. Pending totals are all zero.
    expect(totals.pending.base_gbp_pence[0]).toBe(0);
    expect(totals.pending.loaded_gbp_pence[0]).toBe(0);
    expect(totals.pending.horizon_base_gbp_pence).toBe(0);
    expect(totals.pending.horizon_loaded_gbp_pence).toBe(0);
    expect(totals.pending.incomplete).toBe(false);
    // Combined = just B's contribution.
    expect(totals.combined.base_gbp_pence[0]).toBe(0);
    expect(totals.combined.loaded_gbp_pence[0]).toBe(0);
    expect(totals.combined.base_gbp_pence[1]).toBe(200000);
    expect(totals.combined.loaded_gbp_pence[1]).toBe(220000);
    expect(totals.combined.incomplete).toBe(false);
  });

  it('hired roles with incomplete assumptions flag totals', () => {
    const hiredIncomplete = [
      makeHiredRole({
        id: 'F', title: 'Foxtrot', approval_status: 'pending',
        target_start_month: '2026-02-01', compensation_currency: 'EUR',
        fx_rate_to_gbp: null,
      }),
    ];
    const { totals, incompleteRoleIds } = buildCostMatrix(hiredIncomplete, settings, { startMonth: '2026-01-01', months: 12 });
    expect(incompleteRoleIds).toEqual(['F']);
    expect(totals.pending.incomplete).toBe(true);
    expect(totals.combined.incomplete).toBe(true);
  });

  it('excludes denied roles from every total', () => {
    const denied = [makeRole({ id: 'D2', approval_status: 'denied' })];
    const { totals } = buildCostMatrix(denied, settings, { startMonth: '2026-01-01', months: 12 });
    expect(totals.approved.horizon_loaded_gbp_pence).toBe(0);
    expect(totals.pending.horizon_loaded_gbp_pence).toBe(0);
    expect(totals.combined.horizon_loaded_gbp_pence).toBe(0);
    expect(totals.combined.incomplete).toBe(false);
  });

  it('validates the horizon parameters', () => {
    expect(() => buildCostMatrix([], settings, { startMonth: '2026-01-01', months: 7 }))
      .toThrow(/12, 24 or 36/);
  });
});

describe('sortHiringRoles', () => {
  it('orders by target start month, then numeric priority, then title, nulls last', () => {
    const roles = [
      { id: 1, title: 'Zulu', target_start_month: null, priority: 0 },
      { id: 2, title: 'Yankee', target_start_month: '2026-03-01', priority: 2 },
      { id: 3, title: 'Beta', target_start_month: '2026-02-01', priority: 1 },
      { id: 4, title: 'Alpha', target_start_month: '2026-02-01', priority: 1 },
      { id: 5, title: 'Golf', target_start_month: '2026-02-01', priority: 0 },
      { id: 6, title: 'Hotel', target_start_month: '2026-02-01', priority: null },
      { id: 7, title: 'X-ray', target_start_month: null, priority: null },
    ];
    const sorted = sortHiringRoles(roles);
    expect(sorted.map((r) => r.id)).toEqual([
      5,   // Feb, priority 0
      4,   // Feb, priority 1, Alpha
      3,   // Feb, priority 1, Beta
      6,   // Feb, null priority last within the month
      2,   // Mar
      1, 7, // null start months last, ordered by priority then title
    ]);
  });

  it('does not mutate the input array', () => {
    const roles = [
      { id: 1, title: 'B', target_start_month: '2026-03-01', priority: 0 },
      { id: 2, title: 'A', target_start_month: '2026-02-01', priority: 0 },
    ];
    const copy = roles.slice();
    sortHiringRoles(roles);
    expect(roles).toEqual(copy);
  });

  it('treats Date objects and ISO strings as the same month', () => {
    const roles = [
      { id: 1, title: 'B', target_start_month: new Date(2026, 1, 1), priority: 0 },
      { id: 2, title: 'A', target_start_month: '2026-02-01', priority: 0 },
    ];
    expect(sortHiringRoles(roles).map((r) => r.id)).toEqual([2, 1]);
  });

  it('compares priority numerically, not lexically', () => {
    const roles = [
      { id: 1, title: 'A', target_start_month: '2026-02-01', priority: '2' },
      { id: 2, title: 'B', target_start_month: '2026-02-01', priority: '10' },
    ];
    // Numeric: 2 < 10. Lexical would put '10' first.
    expect(sortHiringRoles(roles).map((r) => r.id)).toEqual([1, 2]);
  });
});

describe('monthKeyOf', () => {
  it('normalises Date objects, ISO strings and missing values (exported for the Excel export)', () => {
    expect(monthKeyOf(new Date(2026, 8, 1))).toBe('2026-09');
    expect(monthKeyOf('2026-09-15')).toBe('2026-09');
    expect(monthKeyOf('2026-09-01T00:00:00.000Z')).toBe('2026-09');
    expect(monthKeyOf(null)).toBeNull();
    expect(monthKeyOf('nonsense')).toBeNull();
  });
});

describe('moneyFromPence', () => {
  it('formats pence as GBP with thousands separators', () => {
    expect(moneyFromPence(123456)).toBe('£1,234.56');
    expect(moneyFromPence(1234567890)).toBe('£12,345,678.90');
  });

  it('formats small and zero amounts', () => {
    expect(moneyFromPence(0)).toBe('£0.00');
    expect(moneyFromPence(5)).toBe('£0.05');
    expect(moneyFromPence(100)).toBe('£1.00');
  });

  it('passes null and undefined through as null', () => {
    expect(moneyFromPence(null)).toBeNull();
    expect(moneyFromPence(undefined)).toBeNull();
  });

  it('formats negative amounts with a leading minus sign', () => {
    expect(moneyFromPence(-123456)).toBe('-£1,234.56');
  });
});

// ---------------------------------------------------------------------------
// incomplete_reasons -- why a row cannot be costed (2026-07-24 Monthly Costs
// honesty fix). The matrix previously labelled every incomplete role "no
// salary on record", which was false whenever the client's on-cost defaults
// were the missing input (Couch Heroes: 28 of 30 roles had salaries).
// ---------------------------------------------------------------------------

describe('incomplete_reasons', () => {
  const months12 = buildMonthHorizon('2026-01-01', 12);

  it('planned role: always not-incomplete, no reasons (zero contribution)', () => {
    const row = buildRoleCostRow(makeRole(), null, months12);
    expect(row.incomplete).toBe(false);
    expect(row.incomplete_reasons).toEqual([]);
  });

  it('hired role, complete: not-incomplete, no reasons', () => {
    const row = buildRoleCostRow(makeHiredRole(), SETTINGS, months12);
    expect(row.incomplete).toBe(false);
    expect(row.incomplete_reasons).toEqual([]);
  });

  it('hired FTE, no settings row and no override: missing_on_cost_default', () => {
    const row = buildRoleCostRow(makeHiredRole(), null, months12);
    expect(row.incomplete).toBe(true);
    expect(row.incomplete_reasons).toEqual(['missing_on_cost_default']);
  });

  it('hired contractor with no settings row: complete — contractors are never weighted', () => {
    const row = buildRoleCostRow(makeHiredRole({ employment_type: 'contractor' }), null, months12);
    expect(row.incomplete).toBe(false);
    expect(row.incomplete_reasons).toEqual([]);
    // Weighted equals base from the first payment month onwards.
    expect(row.loaded_gbp_pence[2]).toBe(500000);
  });

  it('hired role with unknown engagement type: missing_engagement_type', () => {
    const row = buildRoleCostRow(makeHiredRole({ employment_type: 'llama' }), SETTINGS, months12);
    expect(row.incomplete).toBe(true);
    expect(row.incomplete_reasons).toEqual(['missing_engagement_type']);
  });

  it('hired, on-cost override rescues from missing settings row', () => {
    const row = buildRoleCostRow(makeHiredRole({ on_cost_override_pct: '12' }), null, months12);
    expect(row.incomplete).toBe(false);
    expect(row.incomplete_reasons).toEqual([]);
  });

  it('hired, missing salary: missing_salary', () => {
    const row = buildRoleCostRow(makeHiredRole({ budgeted_compensation: null }), SETTINGS, months12);
    expect(row.incomplete).toBe(true);
    expect(row.incomplete_reasons).toEqual(['missing_salary']);
  });

  it('hired, daily basis without workdays: missing_workdays', () => {
    const row = buildRoleCostRow(makeHiredRole({ compensation_basis: 'daily', budgeted_compensation: '400' }), SETTINGS, months12);
    expect(row.incomplete_reasons).toEqual(['missing_workdays']);
  });

  it('hired, non-GBP without stored FX rate: missing_fx_rate', () => {
    const row = buildRoleCostRow(makeHiredRole({ compensation_currency: 'EUR' }), SETTINGS, months12);
    expect(row.incomplete_reasons).toEqual(['missing_fx_rate']);
  });

  it('hired, missing currency: missing_currency', () => {
    const row = buildRoleCostRow(makeHiredRole({ compensation_currency: null }), SETTINGS, months12);
    expect(row.incomplete_reasons).toEqual(['missing_currency']);
  });

  it('hired, unknown basis: missing_basis', () => {
    const row = buildRoleCostRow(makeHiredRole({ compensation_basis: 'weekly' }), SETTINGS, months12);
    expect(row.incomplete_reasons).toEqual(['missing_basis']);
  });

  it('hired role without a start month: missing_start_month', () => {
    const row = buildRoleCostRow(makeHiredRole({ target_start_month: null }), SETTINGS, months12);
    expect(row.incomplete).toBe(true);
    expect(row.incomplete_reasons).toEqual(['missing_start_month']);
  });

  it('hired, missing start month AND missing on-cost: both reasons, start first', () => {
    const row = buildRoleCostRow(makeHiredRole({ target_start_month: null }), null, months12);
    expect(row.incomplete_reasons).toEqual(['missing_start_month', 'missing_on_cost_default']);
  });

  it('hired, multiple missing cost inputs are all reported', () => {
    const row = buildRoleCostRow(makeHiredRole({ budgeted_compensation: null, compensation_currency: null }), null, months12);
    expect(row.incomplete_reasons).toEqual(expect.arrayContaining(['missing_salary', 'missing_currency', 'missing_on_cost_default']));
  });

  it('excluded (denied) role: reasons empty even with missing inputs', () => {
    const row = buildRoleCostRow(makeRole({ approval_status: 'denied', budgeted_compensation: null }), null, months12);
    expect(row.excluded).toBe(true);
    expect(row.incomplete_reasons).toEqual([]);
  });

  it('hired role starting beyond horizon with incomplete assumptions: not flagged', () => {
    const row = buildRoleCostRow(makeHiredRole({ target_start_month: '2027-06-01' }), null, months12);
    expect(row.incomplete).toBe(false);
    expect(row.incomplete_reasons).toEqual([]);
  });

  it('buildCostMatrix rows carry incomplete_reasons for hired roles', () => {
    const matrix = buildCostMatrix([makeHiredRole()], null, { startMonth: '2026-01-01', months: 12 });
    expect(matrix.rows[0].incomplete_reasons).toEqual(['missing_on_cost_default']);
  });
});

// ---------------------------------------------------------------------------
// Base/loaded decoupling (Glen's correction, 2026-07-24): salary + start date
// alone must produce visible base costs. The on-cost default only gates the
// loaded figure. Totals track base-only contributions separately so the UI
// can show an honest "base only" figure instead of a blank.
// ---------------------------------------------------------------------------

describe('base/loaded decoupling', () => {
  const months12 = buildMonthHorizon('2026-01-01', 12);

  it('hired, missing on-cost: base cells fill, loaded cells null from first payment month', () => {
    const row = buildRoleCostRow(makeHiredRole(), null, months12);
    // target Feb → first payment March (index 2)
    expect(row.base_gbp_pence[0]).toBe(0);
    expect(row.base_gbp_pence[1]).toBe(0);
    expect(row.base_gbp_pence[2]).toBe(500000);
    expect(row.base_gbp_pence[11]).toBe(500000);
    expect(row.loaded_gbp_pence[0]).toBe(0);
    expect(row.loaded_gbp_pence[1]).toBe(0);
    expect(row.loaded_gbp_pence[2]).toBeNull();
    expect(row.incomplete).toBe(true);
    expect(row.incomplete_reasons).toEqual(['missing_on_cost_default']);
    expect(row.monthly_base_gbp_pence).toBe(500000);
    expect(row.monthly_loaded_gbp_pence).toBeNull();
    expect(row.on_cost_pct).toBeNull();
  });

  it('hired, base-level failure still nulls both arrays', () => {
    const row = buildRoleCostRow(makeHiredRole({ budgeted_compensation: null }), null, months12);
    // target Feb → first payment March (index 2)
    expect(row.base_gbp_pence[2]).toBeNull();
    expect(row.loaded_gbp_pence[2]).toBeNull();
    expect(row.monthly_base_gbp_pence).toBeNull();
  });

  it('hired, on-cost-missing: base to totals, nothing to loaded, base_only flagged', () => {
    const matrix = buildCostMatrix([makeHiredRole({ id: 'X' })], null, { startMonth: '2026-01-01', months: 12 });
    const t = matrix.totals.approved;
    // target Feb → first payment March (index 2). 10 months of costs (Mar-Dec).
    expect(t.base_gbp_pence[1]).toBe(0);
    expect(t.base_gbp_pence[2]).toBe(500000);
    expect(t.loaded_gbp_pence[2]).toBe(0);
    expect(t.base_only_gbp_pence[2]).toBe(500000);
    expect(t.base_only_gbp_pence[0]).toBe(0);
    expect(t.horizon_base_gbp_pence).toBe(500000 * 10);
    expect(t.horizon_loaded_gbp_pence).toBe(0);
    expect(t.horizon_base_only_gbp_pence).toBe(500000 * 10);
    expect(t.incomplete).toBe(true);
    expect(matrix.incompleteRoleIds).toEqual(['X']);
  });

  it('hired, fully configured: zero base_only contributions', () => {
    const matrix = buildCostMatrix([makeHiredRole({ id: 'Y' })], SETTINGS, { startMonth: '2026-01-01', months: 12 });
    const t = matrix.totals.approved;
    expect(t.base_only_gbp_pence.every((v) => v === 0)).toBe(true);
    expect(t.horizon_base_only_gbp_pence).toBe(0);
    expect(t.incomplete).toBe(false);
  });

  it('planned roles: base/loaded decoupling irrelevant (all zeros)', () => {
    const row = buildRoleCostRow(makeRole(), null, months12);
    expect(row.base_gbp_pence.every((v) => v === 0)).toBe(true);
    expect(row.loaded_gbp_pence.every((v) => v === 0)).toBe(true);
    expect(row.incomplete).toBe(false);
    // But per-unit cost metadata still computed for the detail view
    expect(row.monthly_base_gbp_pence).toBe(500000);
    expect(row.monthly_loaded_gbp_pence).toBeNull();
  });
});

describe('nextMonthKey', () => {
  it('advances a normal month', () => {
    expect(nextMonthKey('2026-03')).toBe('2026-04');
  });

  it('wraps December to January of the next year', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01');
  });

  it('handles January', () => {
    expect(nextMonthKey('2026-01')).toBe('2026-02');
  });

  it('returns null for invalid input', () => {
    expect(nextMonthKey(null)).toBeNull();
    expect(nextMonthKey('nonsense')).toBeNull();
    expect(nextMonthKey('2026-13')).toBeNull();
    expect(nextMonthKey('2026-00')).toBeNull();
  });
});
