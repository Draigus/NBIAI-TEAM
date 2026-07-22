// dashboard-server/lib/hiring-plan-permissions.js
//
// Capability resolution and server-side field redaction for the Hiring Plan.
//
// Authority: design spec Section 5 (People and Permissions).
//
// This module is PURE: no database access, no Express. It receives pre-fetched
// context objects and returns capability flags + redacted copies of role/settings
// objects. Route handlers call resolveHiringCapabilities once per request, then
// pass the result to redactHiringRole for each position in the response.

'use strict';

// -- Field groups ------------------------------------------------------------
// Column names match migration 084_hiring_plan.sql exactly.

const SALARY_RANGE_FIELDS = Object.freeze([
  'compensation_min',
  'compensation_max',
  'compensation_currency',
  'compensation_basis',
]);

const BUDGET_FIELDS = Object.freeze([
  'budgeted_compensation',
  'expected_workdays_per_month',
  'fx_rate_to_gbp',
  'fx_rate_effective_date',
  'fx_rate_source_note',
  'on_cost_override_pct',
]);

const FINANCIAL_FIELDS = Object.freeze([...SALARY_RANGE_FIELDS, ...BUDGET_FIELDS]);

const OPERATIONAL_FIELDS = Object.freeze([
  'title',
  'department_id',
  'seniority',
  'location',
  'employment_type',
  'requirement_type',
  'priority',
  'target_start_month',
  'hiring_manager_user_id',
  'requested_by_user_id',
  'description',
  'discipline',
  'status',
]);

const MATERIAL_FIELDS = Object.freeze([
  'budgeted_compensation',
  'compensation_currency',
  'employment_type',
  'department_id',
]);

const SETTINGS_FINANCIAL_FIELDS = new Set([
  'fte_on_cost_pct',
  'contractor_on_cost_pct',
  'psc_on_cost_pct',
]);

// -- Capability resolution ---------------------------------------------------

function isNbiAdmin(user) {
  return !!user && !user.clientId && user.role === 'admin';
}

function isClientAdmin(user) {
  return !!user && !!user.clientId && user.clientRole === 'admin';
}

function resolveHiringCapabilities({ user, clientId, settings, departments, recruiterUserIds, position }) {
  const uid = user && user.id;
  const depts = Array.isArray(departments) ? departments : [];
  const recruiters = Array.isArray(recruiterUserIds) ? recruiterUserIds : [];

  const directedDeptIds = depts
    .filter(d => d.director_user_id === uid && d.is_active)
    .map(d => d.id);

  const isDeptDirector = directedDeptIds.length > 0;
  const isCoo = !!(settings && settings.coo_user_id === uid);
  const isFinanceDir = !!(settings && settings.finance_director_user_id === uid);
  const isRecruiter = recruiters.includes(uid);
  const admin = isNbiAdmin(user);
  const clientAdm = isClientAdmin(user);

  const hasPlanningRole = admin || isCoo || isFinanceDir || isDeptDirector || isRecruiter;

  return {
    view_all_roles: true,
    view_salary_range: admin || isCoo || isFinanceDir || isRecruiter,
    view_financials: admin || isCoo || isFinanceDir,
    create_requirement: hasPlanningRole,
    edit_requirement: hasPlanningRole,
    edit_financials: admin || isCoo || isFinanceDir,
    submit_for_approval: hasPlanningRole,
    approve_or_deny: admin || isCoo,
    maintain_pipeline: admin || isRecruiter,
    configure: admin || clientAdm,
    export: hasPlanningRole,
    departmentIds: directedDeptIds,
  };
}

// -- Redaction ---------------------------------------------------------------

const _budgetSet = new Set(BUDGET_FIELDS);
const _financialSet = new Set(FINANCIAL_FIELDS);

function redactHiringRole(role, capabilities) {
  if (!role) return role;

  if (capabilities.view_financials) {
    return { ...role };
  }

  const out = {};
  const stripSet = capabilities.view_salary_range ? _budgetSet : _financialSet;

  for (const key of Object.keys(role)) {
    if (key === 'monthly_costs') continue;
    if (stripSet.has(key)) continue;
    out[key] = role[key];
  }

  return out;
}

function redactHiringSettings(settings, capabilities) {
  if (!settings) return null;

  if (capabilities.view_financials) {
    return { ...settings };
  }

  const out = {};
  for (const key of Object.keys(settings)) {
    if (SETTINGS_FINANCIAL_FIELDS.has(key)) continue;
    out[key] = settings[key];
  }
  return out;
}

// -- Client scope assertion --------------------------------------------------

function assertClientScope(user, clientId) {
  if (!user.clientId) return;
  if (user.clientId === clientId) return;
  const err = new Error('Client scope violation: user does not have access to this client');
  err.statusCode = 403;
  throw err;
}

module.exports = {
  OPERATIONAL_FIELDS,
  FINANCIAL_FIELDS,
  SALARY_RANGE_FIELDS,
  BUDGET_FIELDS,
  MATERIAL_FIELDS,
  resolveHiringCapabilities,
  redactHiringRole,
  redactHiringSettings,
  assertClientScope,
};
