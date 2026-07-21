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
} = require('../../lib/hiring-costs.js');

// Baseline settings row: NUMERIC strings as pg returns them.
const SETTINGS = {
  fte_on_cost_pct: '10.0000',
  contractor_on_cost_pct: '15.0000',
  psc_on_cost_pct: '2.0000',
};

// Complete, approved GBP annual role. 60000 annual = 5000/month = 500000
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

describe('calculateMonthlyCost', () => {
  it('calculates daily PSC cost in GBP pence with role on-cost override', () => {
    const result = calculateMonthlyCost({
      budgeted_compensation: '500',
      compensation_basis: 'daily',
      expected_workdays_per_month: '18',
      compensation_currency: 'EUR',
      fx_rate_to_gbp: '0.86',
      on_cost_override_pct: '5',
      employment_type: 'psc'
    }, { psc_on_cost_pct: '2' });
    expect(result).toEqual({
      paidMinor: 900000,
      baseGbpPence: 774000,
      loadedGbpPence: 812700,
      onCostPct: 5
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

  it('calculates monthly non-GBP cost using the stored FX rate', () => {
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
      loadedGbpPence: 346150,
      onCostPct: 15,
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
      employment_type: 'psc',
    }, { psc_on_cost_pct: '2.0000' });
    expect(result).toEqual({
      paidMinor: 900000,
      baseGbpPence: 774000,
      loadedGbpPence: 812700,
      onCostPct: 5,
    });
  });

  describe('legacy engagement spellings map to canonical settings defaults', () => {
    it("maps 'permanent' to the FTE default", () => {
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

    it("maps 'contract' to the contractor default", () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '4000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        employment_type: 'contract',
      }, SETTINGS);
      expect(result.onCostPct).toBe(15);
      expect(result.loadedGbpPence).toBe(460000);
    });

    it("maps 'freelance' to the PSC default", () => {
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
        loadedGbpPence: 816000,
        onCostPct: 2,
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

  describe('on-cost resolution', () => {
    it('a zero override wins over a non-zero client default', () => {
      const result = calculateMonthlyCost({
        budgeted_compensation: '1000',
        compensation_basis: 'monthly',
        compensation_currency: 'GBP',
        on_cost_override_pct: '0',
        employment_type: 'contractor',
      }, SETTINGS);
      expect(result.onCostPct).toBe(0);
      expect(result.loadedGbpPence).toBe(result.baseGbpPence);
    });

    it('a zero client default is complete, not incomplete', () => {
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
      ['no override and unknown employment_type', { employment_type: 'llama' }, SETTINGS],
      ['no override and missing employment_type', { employment_type: null }, SETTINGS],
      ['no override and no settings row', {}, null],
      ['no override and settings row missing the pct', {}, {}],
      ['unparseable on_cost_override_pct', { on_cost_override_pct: 'n/a' }, SETTINGS],
    ];
    for (const [name, overrides, settings] of cases) {
      it(name, () => {
        expect(calculateMonthlyCost(makeRole(overrides), settings)).toBeNull();
      });
    }

    it('GBP without an FX rate is complete (implicit rate of 1)', () => {
      expect(calculateMonthlyCost(makeRole(), SETTINGS)).toEqual({
        paidMinor: 500000,
        baseGbpPence: 500000,
        loadedGbpPence: 550000,
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

  it('zeros cells before the target start month and costs from it onwards', () => {
    const row = buildRoleCostRow(makeRole(), SETTINGS, MONTHS);
    expect(row.base_gbp_pence).toEqual([0, 500000, 500000, 500000]);
    expect(row.loaded_gbp_pence).toEqual([0, 550000, 550000, 550000]);
    expect(row.incomplete).toBe(false);
    expect(row.excluded).toBe(false);
  });

  it('includes pending roles from their start month', () => {
    const row = buildRoleCostRow(makeRole({ approval_status: 'pending' }), SETTINGS, MONTHS);
    expect(row.loaded_gbp_pence).toEqual([0, 550000, 550000, 550000]);
  });

  it('costs every month when the role starts before the horizon', () => {
    const row = buildRoleCostRow(makeRole({ target_start_month: '2025-06-01' }), SETTINGS, MONTHS);
    expect(row.loaded_gbp_pence).toEqual([550000, 550000, 550000, 550000]);
  });

  it('denied roles contribute zero even with complete assumptions', () => {
    const row = buildRoleCostRow(makeRole({ approval_status: 'denied' }), SETTINGS, MONTHS);
    expect(row.base_gbp_pence).toEqual([0, 0, 0, 0]);
    expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
    expect(row.excluded).toBe(true);
    expect(row.incomplete).toBe(false);
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

  it('hired roles use the actual start month when available', () => {
    const row = buildRoleCostRow(
      makeRole({
        status: 'closed',
        closed_reason: 'filled',
        target_start_month: '2026-02-01',
        actual_start_date: '2026-03-15',
      }),
      SETTINGS, MONTHS
    );
    expect(row.loaded_gbp_pence).toEqual([0, 0, 550000, 550000]);
  });

  it('hired roles fall back to the target start month without an actual start', () => {
    const row = buildRoleCostRow(
      makeRole({ status: 'closed', closed_reason: 'filled' }),
      SETTINGS, MONTHS
    );
    expect(row.loaded_gbp_pence).toEqual([0, 550000, 550000, 550000]);
  });

  it('accepts pg Date objects for start dates', () => {
    const row = buildRoleCostRow(
      makeRole({
        status: 'closed',
        closed_reason: 'filled',
        target_start_month: new Date(2026, 1, 1),
        actual_start_date: new Date(2026, 2, 1),
      }),
      SETTINGS, MONTHS
    );
    expect(row.loaded_gbp_pence).toEqual([0, 0, 550000, 550000]);
  });

  it('incomplete assumptions produce null cells from the start month, never zero', () => {
    const row = buildRoleCostRow(
      makeRole({ compensation_currency: 'EUR', fx_rate_to_gbp: null }),
      SETTINGS, MONTHS
    );
    expect(row.base_gbp_pence).toEqual([0, null, null, null]);
    expect(row.loaded_gbp_pence).toEqual([0, null, null, null]);
    expect(row.incomplete).toBe(true);
  });

  it('a missing start month makes every cell null', () => {
    const row = buildRoleCostRow(makeRole({ target_start_month: null }), SETTINGS, MONTHS);
    expect(row.base_gbp_pence).toEqual([null, null, null, null]);
    expect(row.loaded_gbp_pence).toEqual([null, null, null, null]);
    expect(row.incomplete).toBe(true);
  });

  it('a role starting after the horizon contributes zero and is not incomplete', () => {
    const row = buildRoleCostRow(
      makeRole({ target_start_month: '2027-01-01', compensation_currency: 'EUR', fx_rate_to_gbp: null }),
      SETTINGS, MONTHS
    );
    expect(row.loaded_gbp_pence).toEqual([0, 0, 0, 0]);
    expect(row.incomplete).toBe(false);
  });
});

describe('buildCostMatrix', () => {
  const settings = SETTINGS;
  const roles = [
    // Approved annual role, starts February. 550000 loaded/month.
    makeRole({ id: 'A', title: 'Alpha', target_start_month: '2026-02-01', priority: 1 }),
    // Approved hired role, actual start January (target March). Monthly 2000
    // GBP = 200000 base, 220000 loaded.
    makeRole({
      id: 'B', title: 'Bravo', status: 'closed', closed_reason: 'filled',
      target_start_month: '2026-03-01', actual_start_date: '2026-01-10',
      budgeted_compensation: '2000', compensation_basis: 'monthly', priority: 0,
    }),
    // Pending daily PSC role from January. 100 * 10 = 100000 base, 102000 loaded.
    makeRole({
      id: 'C', title: 'Charlie', approval_status: 'pending',
      target_start_month: '2026-01-01', budgeted_compensation: '100',
      compensation_basis: 'daily', expected_workdays_per_month: '10',
      employment_type: 'psc', priority: 2,
    }),
    // Denied role: contributes nothing anywhere.
    makeRole({ id: 'D', title: 'Delta', approval_status: 'denied', target_start_month: null }),
    // Pending role with missing FX from February: incomplete.
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
    // Default sort: start month asc (C Jan; E then A in Feb by priority; B Mar), nulls last (D).
    expect(matrix.rows.map((r) => r.roleId)).toEqual(['C', 'E', 'A', 'B', 'D']);
    expect(matrix.incompleteRoleIds).toEqual(['E']);
  });

  it('totals approved roles exactly, including the hired role from its actual start', () => {
    const { totals } = buildCostMatrix(roles, settings, { startMonth: '2026-01-01', months: 12 });
    expect(totals.approved.base_gbp_pence[0]).toBe(200000);
    expect(totals.approved.base_gbp_pence[1]).toBe(700000);
    expect(totals.approved.base_gbp_pence[11]).toBe(700000);
    expect(totals.approved.loaded_gbp_pence[0]).toBe(220000);
    expect(totals.approved.loaded_gbp_pence[1]).toBe(770000);
    expect(totals.approved.horizon_base_gbp_pence).toBe(200000 + 700000 * 11);
    expect(totals.approved.horizon_loaded_gbp_pence).toBe(220000 + 770000 * 11);
    expect(totals.approved.incomplete).toBe(false);
  });

  it('marks pending and combined totals incomplete with null cells, never a cheaper sum', () => {
    const { totals } = buildCostMatrix(roles, settings, { startMonth: '2026-01-01', months: 12 });
    // January: only C contributes (E starts February).
    expect(totals.pending.base_gbp_pence[0]).toBe(100000);
    expect(totals.pending.loaded_gbp_pence[0]).toBe(102000);
    // February onwards E's cells are null, so the totals are null, not a partial sum.
    expect(totals.pending.base_gbp_pence[1]).toBeNull();
    expect(totals.pending.loaded_gbp_pence[11]).toBeNull();
    expect(totals.pending.horizon_base_gbp_pence).toBeNull();
    expect(totals.pending.horizon_loaded_gbp_pence).toBeNull();
    expect(totals.pending.incomplete).toBe(true);
    // Combined inherits the incompleteness.
    expect(totals.combined.base_gbp_pence[0]).toBe(300000);
    expect(totals.combined.loaded_gbp_pence[0]).toBe(322000);
    expect(totals.combined.base_gbp_pence[1]).toBeNull();
    expect(totals.combined.horizon_loaded_gbp_pence).toBeNull();
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
