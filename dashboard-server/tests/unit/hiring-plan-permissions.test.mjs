// dashboard-server/tests/unit/hiring-plan-permissions.test.mjs
//
// Tests for lib/hiring-plan-permissions.js — capability resolution and
// server-side field redaction for the Hiring Plan feature.
//
// Authority: design spec Section 5 (People and Permissions) and the
// implementation plan Task 4.

import { describe, it, expect, beforeAll } from 'vitest';

const {
  OPERATIONAL_FIELDS,
  FINANCIAL_FIELDS,
  SALARY_RANGE_FIELDS,
  BUDGET_FIELDS,
  MATERIAL_FIELDS,
  resolveHiringCapabilities,
  redactHiringRole,
  redactHiringSettings,
  assertClientScope,
} = await import('../../lib/hiring-plan-permissions.js');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CLIENT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CLIENT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEPT_ENG = 'dddddddd-0001-0001-0001-000000000001';
const DEPT_ART = 'dddddddd-0002-0002-0002-000000000002';

const USER_NBI_ADMIN = {
  id: '11111111-1111-1111-1111-111111111111',
  role: 'admin',
  clientId: null,
  clientRole: null,
};

const USER_COO = {
  id: '22222222-2222-2222-2222-222222222222',
  role: 'member',
  clientId: CLIENT_A,
  clientRole: 'admin',
};

const USER_FINANCE = {
  id: '33333333-3333-3333-3333-333333333333',
  role: 'member',
  clientId: CLIENT_A,
  clientRole: 'member',
};

const USER_DEPT_DIRECTOR = {
  id: '44444444-4444-4444-4444-444444444444',
  role: 'member',
  clientId: CLIENT_A,
  clientRole: 'member',
};

const USER_RECRUITER = {
  id: '55555555-5555-5555-5555-555555555555',
  role: 'member',
  clientId: CLIENT_A,
  clientRole: 'member',
};

const USER_CLIENT_ADMIN = {
  id: '66666666-6666-6666-6666-666666666666',
  role: 'member',
  clientId: CLIENT_A,
  clientRole: 'admin',
};

const USER_CLIENT_MEMBER = {
  id: '77777777-7777-7777-7777-777777777777',
  role: 'member',
  clientId: CLIENT_A,
  clientRole: 'member',
};

const USER_NBI_MEMBER = {
  id: '88888888-8888-8888-8888-888888888888',
  role: 'member',
  clientId: null,
  clientRole: null,
};

const SETTINGS = {
  client_id: CLIENT_A,
  coo_user_id: USER_COO.id,
  finance_director_user_id: USER_FINANCE.id,
  fte_on_cost_pct: '18.0000',
  contractor_on_cost_pct: '5.0000',
  psc_on_cost_pct: '0.0000',
  permitted_currencies: ['GBP', 'EUR', 'USD'],
};

const DEPARTMENTS = [
  { id: DEPT_ENG, client_id: CLIENT_A, director_user_id: USER_DEPT_DIRECTOR.id, name: 'Engineering', is_active: true },
  { id: DEPT_ART, client_id: CLIENT_A, director_user_id: null, name: 'Art', is_active: true },
];

const RECRUITER_IDS = [USER_RECRUITER.id];

function fullRole() {
  return {
    id: 'rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr',
    client_id: CLIENT_A,
    title: 'Senior Engineer',
    department_id: DEPT_ENG,
    seniority: 'Senior',
    location: 'Remote',
    employment_type: 'fte',
    requirement_type: 'new',
    priority: 1,
    target_start_month: '2026-09-01',
    hiring_manager_user_id: USER_DEPT_DIRECTOR.id,
    requested_by_user_id: USER_DEPT_DIRECTOR.id,
    description: 'Build things.',
    discipline: 'Engineering',
    status: 'open',
    approval_status: 'approved',
    compensation_min: '80000.0000',
    compensation_max: '100000.0000',
    budgeted_compensation: '90000.0000',
    compensation_currency: 'GBP',
    compensation_basis: 'annual',
    expected_workdays_per_month: '21.0000',
    fx_rate_to_gbp: '1.0000',
    fx_rate_effective_date: '2026-07-01',
    fx_rate_source_note: 'GBP base',
    on_cost_override_pct: null,
    planning_version: 1,
  };
}

function resolve(user, opts = {}) {
  return resolveHiringCapabilities({
    user,
    clientId: opts.clientId || CLIENT_A,
    settings: opts.settings || SETTINGS,
    departments: opts.departments || DEPARTMENTS,
    recruiterUserIds: opts.recruiterUserIds || RECRUITER_IDS,
    position: opts.position || null,
  });
}

// ---------------------------------------------------------------------------
// Field list exports
// ---------------------------------------------------------------------------

describe('field list exports', () => {
  it('OPERATIONAL_FIELDS is a frozen array of strings', () => {
    expect(Array.isArray(OPERATIONAL_FIELDS)).toBe(true);
    expect(OPERATIONAL_FIELDS.length).toBeGreaterThan(0);
    expect(Object.isFrozen(OPERATIONAL_FIELDS)).toBe(true);
    for (const f of OPERATIONAL_FIELDS) expect(typeof f).toBe('string');
  });

  it('FINANCIAL_FIELDS is a frozen array covering all money columns', () => {
    expect(Array.isArray(FINANCIAL_FIELDS)).toBe(true);
    expect(Object.isFrozen(FINANCIAL_FIELDS)).toBe(true);
    expect(FINANCIAL_FIELDS).toContain('compensation_min');
    expect(FINANCIAL_FIELDS).toContain('budgeted_compensation');
    expect(FINANCIAL_FIELDS).toContain('fx_rate_to_gbp');
    expect(FINANCIAL_FIELDS).toContain('on_cost_override_pct');
  });

  it('SALARY_RANGE_FIELDS is a subset of FINANCIAL_FIELDS', () => {
    for (const f of SALARY_RANGE_FIELDS) {
      expect(FINANCIAL_FIELDS).toContain(f);
    }
  });

  it('BUDGET_FIELDS is a subset of FINANCIAL_FIELDS', () => {
    for (const f of BUDGET_FIELDS) {
      expect(FINANCIAL_FIELDS).toContain(f);
    }
  });

  it('SALARY_RANGE_FIELDS and BUDGET_FIELDS together equal FINANCIAL_FIELDS', () => {
    const combined = new Set([...SALARY_RANGE_FIELDS, ...BUDGET_FIELDS]);
    const financialSet = new Set(FINANCIAL_FIELDS);
    expect(combined).toEqual(financialSet);
  });

  it('MATERIAL_FIELDS is a frozen array', () => {
    expect(Array.isArray(MATERIAL_FIELDS)).toBe(true);
    expect(Object.isFrozen(MATERIAL_FIELDS)).toBe(true);
    expect(MATERIAL_FIELDS).toContain('budgeted_compensation');
    expect(MATERIAL_FIELDS).toContain('employment_type');
    expect(MATERIAL_FIELDS).toContain('department_id');
  });

  it('OPERATIONAL and FINANCIAL fields have no overlap', () => {
    const overlap = OPERATIONAL_FIELDS.filter(f => FINANCIAL_FIELDS.includes(f));
    expect(overlap).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveHiringCapabilities
// ---------------------------------------------------------------------------

describe('resolveHiringCapabilities', () => {
  describe('NBI administrator', () => {
    it('receives all capabilities', () => {
      const caps = resolve(USER_NBI_ADMIN);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(true);
      expect(caps.view_financials).toBe(true);
      expect(caps.create_requirement).toBe(true);
      expect(caps.edit_requirement).toBe(true);
      expect(caps.edit_financials).toBe(true);
      expect(caps.submit_for_approval).toBe(true);
      expect(caps.approve_or_deny).toBe(true);
      expect(caps.maintain_pipeline).toBe(true);
      expect(caps.configure).toBe(true);
      expect(caps.export).toBe(true);
    });

    it('departmentIds is empty (NBI admin is not scoped)', () => {
      const caps = resolve(USER_NBI_ADMIN);
      expect(caps.departmentIds).toEqual([]);
    });
  });

  describe('COO', () => {
    it('can approve, view financials and configure', () => {
      const caps = resolve(USER_COO);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(true);
      expect(caps.view_financials).toBe(true);
      expect(caps.create_requirement).toBe(true);
      expect(caps.edit_requirement).toBe(true);
      expect(caps.edit_financials).toBe(true);
      expect(caps.submit_for_approval).toBe(true);
      expect(caps.approve_or_deny).toBe(true);
      expect(caps.configure).toBe(true);
      expect(caps.export).toBe(true);
    });

    it('cannot maintain candidate pipeline', () => {
      const caps = resolve(USER_COO);
      expect(caps.maintain_pipeline).toBe(false);
    });
  });

  describe('Finance Director', () => {
    it('can view and edit financials but cannot approve', () => {
      const caps = resolve(USER_FINANCE);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(true);
      expect(caps.view_financials).toBe(true);
      expect(caps.create_requirement).toBe(true);
      expect(caps.edit_requirement).toBe(true);
      expect(caps.edit_financials).toBe(true);
      expect(caps.submit_for_approval).toBe(true);
      expect(caps.approve_or_deny).toBe(false);
      expect(caps.maintain_pipeline).toBe(false);
      expect(caps.export).toBe(true);
    });

    it('configure is only available to client admins', () => {
      const caps = resolve(USER_FINANCE);
      expect(caps.configure).toBe(false);
    });
  });

  describe('Department Director', () => {
    it('can view roles but not financial data', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(false);
      expect(caps.view_financials).toBe(false);
    });

    it('can create and edit requirements', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.create_requirement).toBe(true);
      expect(caps.edit_requirement).toBe(true);
    });

    it('cannot edit financials or approve', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.edit_financials).toBe(false);
      expect(caps.approve_or_deny).toBe(false);
    });

    it('can submit for approval for own department only', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.submit_for_approval).toBe(true);
    });

    it('departmentIds contains only directed departments', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.departmentIds).toEqual([DEPT_ENG]);
      expect(caps.departmentIds).not.toContain(DEPT_ART);
    });

    it('can export visible plan data', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.export).toBe(true);
    });

    it('cannot maintain pipeline or configure', () => {
      const caps = resolve(USER_DEPT_DIRECTOR);
      expect(caps.maintain_pipeline).toBe(false);
      expect(caps.configure).toBe(false);
    });
  });

  describe('Recruiter', () => {
    it('can view salary ranges but not exact budget', () => {
      const caps = resolve(USER_RECRUITER);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(true);
      expect(caps.view_financials).toBe(false);
    });

    it('can create and edit requirements, submit, export', () => {
      const caps = resolve(USER_RECRUITER);
      expect(caps.create_requirement).toBe(true);
      expect(caps.edit_requirement).toBe(true);
      expect(caps.submit_for_approval).toBe(true);
      expect(caps.export).toBe(true);
    });

    it('cannot edit financials or approve', () => {
      const caps = resolve(USER_RECRUITER);
      expect(caps.edit_financials).toBe(false);
      expect(caps.approve_or_deny).toBe(false);
    });

    it('can maintain candidate pipeline', () => {
      const caps = resolve(USER_RECRUITER);
      expect(caps.maintain_pipeline).toBe(true);
    });
  });

  describe('Client admin (not COO or Finance)', () => {
    it('can configure departments and workflow owners', () => {
      const caps = resolve(USER_CLIENT_ADMIN);
      expect(caps.configure).toBe(true);
    });

    it('cannot view financials, approve or export plan', () => {
      const caps = resolve(USER_CLIENT_ADMIN);
      expect(caps.view_financials).toBe(false);
      expect(caps.approve_or_deny).toBe(false);
      expect(caps.export).toBe(false);
    });

    it('view_salary_range follows existing ATS rule (false in plan context)', () => {
      const caps = resolve(USER_CLIENT_ADMIN);
      expect(caps.view_salary_range).toBe(false);
    });
  });

  describe('Ordinary client member', () => {
    it('can view roles but nothing financial', () => {
      const caps = resolve(USER_CLIENT_MEMBER);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(false);
      expect(caps.view_financials).toBe(false);
    });

    it('cannot create, edit, submit, approve, configure or export plan', () => {
      const caps = resolve(USER_CLIENT_MEMBER);
      expect(caps.create_requirement).toBe(false);
      expect(caps.edit_requirement).toBe(false);
      expect(caps.edit_financials).toBe(false);
      expect(caps.submit_for_approval).toBe(false);
      expect(caps.approve_or_deny).toBe(false);
      expect(caps.configure).toBe(false);
      expect(caps.export).toBe(false);
    });
  });

  describe('NBI member (non-admin)', () => {
    it('can view roles but not financials', () => {
      const caps = resolve(USER_NBI_MEMBER);
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_salary_range).toBe(false);
      expect(caps.view_financials).toBe(false);
    });

    it('cannot create, edit, submit, approve or configure', () => {
      const caps = resolve(USER_NBI_MEMBER);
      expect(caps.create_requirement).toBe(false);
      expect(caps.edit_requirement).toBe(false);
      expect(caps.edit_financials).toBe(false);
      expect(caps.submit_for_approval).toBe(false);
      expect(caps.approve_or_deny).toBe(false);
      expect(caps.configure).toBe(false);
    });
  });

  describe('edge: user is both COO and department director', () => {
    it('receives the union of both capability sets', () => {
      const dualDepts = [
        { id: DEPT_ENG, client_id: CLIENT_A, director_user_id: USER_COO.id, name: 'Engineering', is_active: true },
      ];
      const caps = resolve(USER_COO, { departments: dualDepts });
      expect(caps.approve_or_deny).toBe(true);
      expect(caps.view_financials).toBe(true);
      expect(caps.departmentIds).toEqual([DEPT_ENG]);
    });
  });

  describe('edge: no settings configured', () => {
    it('returns baseline capabilities when settings is null', () => {
      const caps = resolve(USER_CLIENT_MEMBER, { settings: null });
      expect(caps.view_all_roles).toBe(true);
      expect(caps.view_financials).toBe(false);
      expect(caps.approve_or_deny).toBe(false);
    });
  });

  describe('edge: empty departments and recruiters', () => {
    it('dept director gets no departmentIds if departments is empty', () => {
      const caps = resolve(USER_DEPT_DIRECTOR, { departments: [], recruiterUserIds: [] });
      expect(caps.departmentIds).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// redactHiringRole
// ---------------------------------------------------------------------------

describe('redactHiringRole', () => {
  it('NBI admin sees every field unchanged', () => {
    const caps = resolve(USER_NBI_ADMIN);
    const role = fullRole();
    const visible = redactHiringRole(role, caps);
    expect(visible).toEqual(role);
  });

  it('removes every financial field for a Department Director', () => {
    const caps = resolve(USER_DEPT_DIRECTOR);
    const visible = redactHiringRole(fullRole(), caps);
    expect(visible).not.toHaveProperty('compensation_min');
    expect(visible).not.toHaveProperty('compensation_max');
    expect(visible).not.toHaveProperty('budgeted_compensation');
    expect(visible).not.toHaveProperty('compensation_currency');
    expect(visible).not.toHaveProperty('compensation_basis');
    expect(visible).not.toHaveProperty('fx_rate_to_gbp');
    expect(visible).not.toHaveProperty('fx_rate_effective_date');
    expect(visible).not.toHaveProperty('fx_rate_source_note');
    expect(visible).not.toHaveProperty('on_cost_override_pct');
    expect(visible).not.toHaveProperty('expected_workdays_per_month');
    // operational fields survive
    expect(visible).toHaveProperty('title', 'Senior Engineer');
    expect(visible).toHaveProperty('department_id', DEPT_ENG);
    expect(visible).toHaveProperty('priority', 1);
  });

  it('Recruiting keeps salary range but loses budget and cost fields', () => {
    const caps = resolve(USER_RECRUITER);
    const visible = redactHiringRole(fullRole(), caps);
    expect(visible).toHaveProperty('compensation_min', '80000.0000');
    expect(visible).toHaveProperty('compensation_max', '100000.0000');
    expect(visible).toHaveProperty('compensation_currency', 'GBP');
    expect(visible).toHaveProperty('compensation_basis', 'annual');
    expect(visible).not.toHaveProperty('budgeted_compensation');
    expect(visible).not.toHaveProperty('fx_rate_to_gbp');
    expect(visible).not.toHaveProperty('fx_rate_effective_date');
    expect(visible).not.toHaveProperty('fx_rate_source_note');
    expect(visible).not.toHaveProperty('on_cost_override_pct');
    expect(visible).not.toHaveProperty('expected_workdays_per_month');
  });

  it('COO sees everything', () => {
    const caps = resolve(USER_COO);
    const visible = redactHiringRole(fullRole(), caps);
    expect(visible).toHaveProperty('budgeted_compensation', '90000.0000');
    expect(visible).toHaveProperty('fx_rate_to_gbp', '1.0000');
    expect(visible).toHaveProperty('on_cost_override_pct', null);
  });

  it('Finance Director sees everything', () => {
    const caps = resolve(USER_FINANCE);
    const visible = redactHiringRole(fullRole(), caps);
    expect(visible).toHaveProperty('budgeted_compensation', '90000.0000');
    expect(visible).toHaveProperty('fx_rate_to_gbp', '1.0000');
  });

  it('strips monthly_costs for users without view_financials', () => {
    const role = { ...fullRole(), monthly_costs: { months: ['2026-09'], rows: [] } };
    const directorCaps = resolve(USER_DEPT_DIRECTOR);
    const visible = redactHiringRole(role, directorCaps);
    expect(visible).not.toHaveProperty('monthly_costs');

    const recruiterCaps = resolve(USER_RECRUITER);
    const recruiterVisible = redactHiringRole(role, recruiterCaps);
    expect(recruiterVisible).not.toHaveProperty('monthly_costs');
  });

  it('preserves monthly_costs for users with view_financials', () => {
    const costs = { months: ['2026-09'], rows: [] };
    const role = { ...fullRole(), monthly_costs: costs };
    const caps = resolve(USER_NBI_ADMIN);
    const visible = redactHiringRole(role, caps);
    expect(visible.monthly_costs).toEqual(costs);
  });

  it('does not mutate the input role object', () => {
    const role = fullRole();
    const original = { ...role };
    const caps = resolve(USER_DEPT_DIRECTOR);
    redactHiringRole(role, caps);
    expect(role).toEqual(original);
  });

  it('ordinary client member loses all financial fields', () => {
    const caps = resolve(USER_CLIENT_MEMBER);
    const visible = redactHiringRole(fullRole(), caps);
    expect(visible).not.toHaveProperty('compensation_min');
    expect(visible).not.toHaveProperty('budgeted_compensation');
    expect(visible).not.toHaveProperty('fx_rate_to_gbp');
    expect(visible).toHaveProperty('title', 'Senior Engineer');
  });
});

// ---------------------------------------------------------------------------
// redactHiringSettings
// ---------------------------------------------------------------------------

describe('redactHiringSettings', () => {
  it('NBI admin sees full settings including on-cost percentages', () => {
    const caps = resolve(USER_NBI_ADMIN);
    const visible = redactHiringSettings(SETTINGS, caps);
    expect(visible).toHaveProperty('fte_on_cost_pct');
    expect(visible).toHaveProperty('contractor_on_cost_pct');
    expect(visible).toHaveProperty('psc_on_cost_pct');
    expect(visible).toHaveProperty('permitted_currencies');
    expect(visible).toHaveProperty('coo_user_id');
    expect(visible).toHaveProperty('finance_director_user_id');
  });

  it('Department Director sees workflow owners but not on-cost percentages', () => {
    const caps = resolve(USER_DEPT_DIRECTOR);
    const visible = redactHiringSettings(SETTINGS, caps);
    expect(visible).not.toHaveProperty('fte_on_cost_pct');
    expect(visible).not.toHaveProperty('contractor_on_cost_pct');
    expect(visible).not.toHaveProperty('psc_on_cost_pct');
    expect(visible).toHaveProperty('coo_user_id');
    expect(visible).toHaveProperty('finance_director_user_id');
  });

  it('Recruiter sees workflow owners and currencies but not on-cost', () => {
    const caps = resolve(USER_RECRUITER);
    const visible = redactHiringSettings(SETTINGS, caps);
    expect(visible).not.toHaveProperty('fte_on_cost_pct');
    expect(visible).toHaveProperty('permitted_currencies');
    expect(visible).toHaveProperty('coo_user_id');
  });

  it('returns null when settings is null', () => {
    const caps = resolve(USER_NBI_ADMIN);
    expect(redactHiringSettings(null, caps)).toBe(null);
  });

  it('does not mutate the input settings object', () => {
    const settingsCopy = { ...SETTINGS };
    const caps = resolve(USER_DEPT_DIRECTOR);
    redactHiringSettings(SETTINGS, caps);
    expect(SETTINGS).toEqual(settingsCopy);
  });
});

// ---------------------------------------------------------------------------
// assertClientScope
// ---------------------------------------------------------------------------

describe('assertClientScope', () => {
  it('NBI admin passes for any client', () => {
    expect(() => assertClientScope(USER_NBI_ADMIN, CLIENT_A)).not.toThrow();
    expect(() => assertClientScope(USER_NBI_ADMIN, CLIENT_B)).not.toThrow();
  });

  it('NBI member passes for any client', () => {
    expect(() => assertClientScope(USER_NBI_MEMBER, CLIENT_A)).not.toThrow();
  });

  it('client user passes for own client', () => {
    expect(() => assertClientScope(USER_CLIENT_MEMBER, CLIENT_A)).not.toThrow();
  });

  it('client user throws for a different client', () => {
    expect(() => assertClientScope(USER_CLIENT_MEMBER, CLIENT_B)).toThrow();
  });

  it('thrown error includes a message about scope', () => {
    expect(() => assertClientScope(USER_CLIENT_MEMBER, CLIENT_B)).toThrow(/scope/i);
  });
});
