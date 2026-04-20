// dashboard-server/tests/unit/frontend-router.test.mjs
//
// Unit tests for the pure (no-DOM, no-browser-history) logic in router.js.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Provide a minimal window stub — router.js registers functions on window
// and accesses window.currentView, window.currentFilter, etc.
beforeAll(() => {
  if (typeof global.window === 'undefined') global.window = {};
  // Stub history API (not available in Node)
  global.history = { replaceState: () => {}, pushState: () => {} };
  // Stub document (router.js calls getElementById at module load time)
  global.document = {
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: () => {},
  };
  // Stub window.location
  global.window.location = { hash: '' };
  // Stub window.addEventListener (popstate listener registration)
  global.window.addEventListener = () => {};
  // Stub requestAnimationFrame
  global.window.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  // Initialise state that router.js reads on module load
  global.window.currentView = 'dashboard';
  global.window.currentFilter = { sort: 'default', practice: null };
  global.window.taskSubView = 'tree';
  global.window.tasks = [];
  global.window.selectedTaskIds = new Set();
});

const routerUrl = new URL(
  '../../public/js/core/router.js',
  import.meta.url
).href;

let LEGACY_ROUTES, PRACTICES, getPracticeLabel, resetFilters;

beforeAll(async () => {
  const m = await import(routerUrl);
  ({ LEGACY_ROUTES, PRACTICES, getPracticeLabel, resetFilters } = m);
});

// ---- LEGACY_ROUTES ----
describe('LEGACY_ROUTES', () => {
  it('maps incomplete to tasks', () => expect(LEGACY_ROUTES.incomplete).toBe('tasks'));
  it('maps changelog to settings', () => expect(LEGACY_ROUTES.changelog).toBe('settings'));
  it('maps report to dashboard', () => expect(LEGACY_ROUTES.report).toBe('dashboard'));
});

// ---- PRACTICES ----
describe('PRACTICES', () => {
  it('has exactly two entries', () => expect(PRACTICES).toHaveLength(2));
  it('first entry is gaming', () => expect(PRACTICES[0].value).toBe('gaming'));
  it('second entry is organisational_performance', () => expect(PRACTICES[1].value).toBe('organisational_performance'));
  it('each entry has required shape', () => {
    for (const p of PRACTICES) {
      expect(p).toHaveProperty('value');
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('shortLabel');
      expect(p).toHaveProperty('abbrev');
      expect(p).toHaveProperty('colour');
    }
  });
});

// ---- getPracticeLabel ----
describe('getPracticeLabel', () => {
  it('returns Gaming label for gaming slug', () => expect(getPracticeLabel('gaming')).toBe('Gaming'));
  it('returns full label for organisational_performance', () => expect(getPracticeLabel('organisational_performance')).toBe('Organizational Performance'));
  it('returns empty string for null', () => expect(getPracticeLabel(null)).toBe(''));
  it('returns empty string for undefined', () => expect(getPracticeLabel(undefined)).toBe(''));
  it('returns raw value for unknown slug', () => expect(getPracticeLabel('unknown_slug')).toBe('unknown_slug'));
});

// ---- resetFilters ----
describe('resetFilters', () => {
  beforeEach(() => {
    global.window.currentFilter = { client: 'Acme', project: 'p1', status: ['Done'], health: ['Red'], search: 'foo', sort: 'priority', assignee: ['Alice'], incomplete: true, practice: 'gaming' };
    global.window.selectedTaskIds = new Set(['t1', 't2']);
  });

  it('clears client', () => { resetFilters(); expect(global.window.currentFilter.client).toBeNull(); });
  it('clears project', () => { resetFilters(); expect(global.window.currentFilter.project).toBeNull(); });
  it('clears status array', () => { resetFilters(); expect(global.window.currentFilter.status).toEqual([]); });
  it('clears health array', () => { resetFilters(); expect(global.window.currentFilter.health).toEqual([]); });
  it('clears search', () => { resetFilters(); expect(global.window.currentFilter.search).toBe(''); });
  it('preserves sort order', () => { resetFilters(); expect(global.window.currentFilter.sort).toBe('priority'); });
  it('clears assignee array', () => { resetFilters(); expect(global.window.currentFilter.assignee).toEqual([]); });
  it('clears incomplete flag', () => { resetFilters(); expect(global.window.currentFilter.incomplete).toBe(false); });
  it('preserves practice filter', () => { resetFilters(); expect(global.window.currentFilter.practice).toBe('gaming'); });
  it('clears selectedTaskIds', () => { resetFilters(); expect(global.window.selectedTaskIds.size).toBe(0); });
});
