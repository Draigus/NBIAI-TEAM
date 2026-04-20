// dashboard-server/tests/unit/frontend-helpers.test.mjs
//
// Unit tests for the pure (no-window-state) functions in helpers.js.
// Imported directly — no browser environment needed for these.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

// helpers.js uses `window.x = x` at module level, which throws in Node.
// Provide a minimal global.window stub before importing.
beforeAll(() => {
  if (typeof global.window === 'undefined') {
    global.window = {};
  }
});

// Dynamic import after window stub is in place.
const helpersUrl = new URL(
  '../../public/js/core/helpers.js',
  import.meta.url
).href;

let esc, safeUrl, escAttrJs, emptyState,
    healthBadgeHtml, priorityBadgeHtml,
    safeParseDate, fmtMoney, currencySym;

beforeAll(async () => {
  const m = await import(helpersUrl);
  ({ esc, safeUrl, escAttrJs, emptyState,
     healthBadgeHtml, priorityBadgeHtml,
     safeParseDate, fmtMoney, currencySym } = m);
});

describe('esc', () => {
  it('escapes ampersand', () => expect(esc('a & b')).toBe('a &amp; b'));
  it('escapes angle brackets', () => expect(esc('<div>')).toBe('&lt;div&gt;'));
  it('escapes double quotes', () => expect(esc('"hello"')).toBe('&quot;hello&quot;'));
  it('escapes single quotes', () => expect(esc("it's")).toBe('it&#39;s'));
  it('casts non-strings', () => expect(esc(42)).toBe('42'));
});

describe('safeUrl', () => {
  it('returns # for null', () => expect(safeUrl(null)).toBe('#'));
  it('returns # for empty string', () => expect(safeUrl('')).toBe('#'));
  it('allows https', () => expect(safeUrl('https://example.com')).toBe('https://example.com'));
  it('allows http', () => expect(safeUrl('http://example.com')).toBe('http://example.com'));
  it('allows mailto', () => expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com'));
  it('blocks javascript:', () => expect(safeUrl('javascript:alert(1)')).toBe('#'));
  it('blocks data:', () => expect(safeUrl('data:text/html,<h1>x</h1>')).toBe('#'));
  it('allows relative path', () => expect(safeUrl('/dashboard')).toBe('/dashboard'));
  it('allows fragment', () => expect(safeUrl('#section')).toBe('#section'));
  it('escapes special chars in allowed URLs', () => expect(safeUrl('https://x.com/<>')).toBe('https://x.com/&lt;&gt;'));
});

describe('escAttrJs', () => {
  it('escapes backslash', () => expect(escAttrJs('a\\b')).toBe('a\\\\b'));
  it('escapes single quote', () => expect(escAttrJs("a'b")).toBe("a\\'b"));
  it('escapes newline', () => expect(escAttrJs('a\nb')).toBe('a\\nb'));
  it('escapes HTML entities', () => expect(escAttrJs('a&b')).toBe('a&amp;b'));
  it('returns empty for falsy', () => expect(escAttrJs('')).toBe(''));
});

describe('emptyState', () => {
  it('produces expected structure', () => {
    const html = emptyState('📭', 'No tasks', 'Try adding one');
    expect(html).toContain('empty-state');
    expect(html).toContain('No tasks');
    expect(html).toContain('Try adding one');
    expect(html).toContain('📭');
  });
});

describe('healthBadgeHtml', () => {
  it('renders Green badge', () => {
    const h = healthBadgeHtml('Green');
    expect(h).toContain('badge--green');
    expect(h).toContain('Green');
  });
  it('renders Red badge', () => expect(healthBadgeHtml('Red')).toContain('badge--red'));
  it('falls back for unknown', () => expect(healthBadgeHtml('Unknown')).toContain('badge--status'));
});

describe('priorityBadgeHtml', () => {
  it('returns empty string for falsy', () => expect(priorityBadgeHtml('')).toBe(''));
  it('renders High badge', () => expect(priorityBadgeHtml('High')).toContain('badge--priority-high'));
  it('renders Critical ACT badge', () => expect(priorityBadgeHtml('Critical ACT')).toContain('badge--priority-critical'));
  it('renders Low badge', () => expect(priorityBadgeHtml('Low')).toContain('badge--priority-low'));
});

describe('safeParseDate', () => {
  it('returns null for falsy', () => expect(safeParseDate('')).toBeNull());
  it('parses ISO date string', () => {
    const d = safeParseDate('2026-04-20');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // April = 3
    expect(d.getDate()).toBe(20);
  });
  it('parses dd/mm/yyyy format', () => {
    const d = safeParseDate('20/04/2026');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(20);
  });
  it('returns null for garbage', () => expect(safeParseDate('not-a-date')).toBeNull());
  it('sets time to midnight', () => {
    const d = safeParseDate('2026-01-01');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('fmtMoney', () => {
  it('formats millions', () => expect(fmtMoney(1500000)).toBe('1.5M'));
  it('formats exact millions without decimal', () => expect(fmtMoney(2000000)).toBe('2M'));
  it('formats thousands', () => expect(fmtMoney(25000)).toBe('25k'));
  it('formats sub-thousand', () => expect(fmtMoney(500)).toBe('500'));
  it('returns 0 for null', () => expect(fmtMoney(null)).toBe('0'));
  it('returns 0 for NaN string', () => expect(fmtMoney('abc')).toBe('0'));
});

describe('currencySym', () => {
  it('returns $ for USD', () => expect(currencySym('USD')).toBe('$'));
  it('returns € for EUR', () => expect(currencySym('EUR')).toBe('€'));
  it('returns £ for anything else', () => expect(currencySym('GBP')).toBe('£'));
  it('returns £ for undefined', () => expect(currencySym(undefined)).toBe('£'));
});

// ---- State-dependent helpers ----
// These set global.window.tasks (and other state) before each test.

describe('clientPrefix', () => {
  let clientPrefix;
  beforeAll(async () => {
    const m = await import(helpersUrl);
    clientPrefix = m.clientPrefix;
    // Reset the module-private cache by reimporting is not possible after first import,
    // but the known[] lookup is pure so tests below are reliable.
  });

  it('returns CH for Couch Heroes', () => expect(clientPrefix('Couch Heroes')).toBe('CH'));
  it('returns NBI for NBI Operations', () => expect(clientPrefix('NBI Operations')).toBe('NBI'));
  it('auto-generates from initials', () => expect(clientPrefix('Funky Banana Studios')).toBe('FBS'));
  it('returns first 2 chars for single-word name', () => expect(clientPrefix('Acme')).toBe('AC'));
  it('returns empty for falsy', () => expect(clientPrefix('')).toBe(''));
});

describe('getChildren / getRootAncestor / getDescendants', () => {
  let getChildren, getRootAncestor, getDescendants;

  beforeAll(async () => {
    const m = await import(helpersUrl);
    ({ getChildren, getRootAncestor, getDescendants } = m);
  });

  beforeEach(() => {
    global.window.tasks = [
      { id: 'p1', parentId: null, client: 'Acme' },
      { id: 'c1', parentId: 'p1' },
      { id: 'c2', parentId: 'p1' },
      { id: 'gc1', parentId: 'c1' },
    ];
  });

  it('getChildren returns direct children only', () => {
    const kids = getChildren('p1');
    expect(kids.map(t => t.id)).toEqual(['c1', 'c2']);
  });

  it('getChildren returns empty for leaf', () => {
    expect(getChildren('gc1')).toHaveLength(0);
  });

  it('getRootAncestor returns self when no parent', () => {
    expect(getRootAncestor({ id: 'p1', parentId: null })).toEqual({ id: 'p1', parentId: null });
  });

  it('getRootAncestor walks up to root', () => {
    const root = getRootAncestor(global.window.tasks.find(t => t.id === 'gc1'));
    expect(root.id).toBe('p1');
  });

  it('getDescendants returns all descendants', () => {
    const all = getDescendants('p1');
    expect(all.map(t => t.id).sort()).toEqual(['c1', 'c2', 'gc1'].sort());
  });

  it('getDescendants returns empty for leaf', () => {
    expect(getDescendants('gc1')).toHaveLength(0);
  });
});

describe('getTaskClient', () => {
  let getTaskClient;

  beforeAll(async () => {
    const m = await import(helpersUrl);
    getTaskClient = m.getTaskClient;
  });

  beforeEach(() => {
    global.window.tasks = [
      { id: 'root', parentId: null, client: 'Acme' },
      { id: 'child', parentId: 'root', client: null },
    ];
  });

  it('returns own client when set', () => {
    expect(getTaskClient({ id: 'root', parentId: null, client: 'Acme' })).toBe('Acme');
  });

  it('inherits client from root ancestor', () => {
    expect(getTaskClient({ id: 'child', parentId: 'root', client: null })).toBe('Acme');
  });

  it('returns empty string when no client anywhere', () => {
    global.window.tasks = [{ id: 'x', parentId: null, client: null }];
    expect(getTaskClient({ id: 'x', parentId: null, client: null })).toBe('');
  });
});

describe('isTaskIncomplete', () => {
  let isTaskIncomplete;

  beforeAll(async () => {
    const m = await import(helpersUrl);
    isTaskIncomplete = m.isTaskIncomplete;
  });

  beforeEach(() => {
    global.window.tasks = [];
  });

  const complete = {
    id: 't1', parentId: null,
    status: 'In progress',
    hoursEstimated: 4, priority: 'High',
    assignees: ['Alice'], dueDate: '2026-05-01',
    client: 'Acme', description: 'Long enough description here',
  };

  it('returns false for a fully complete task', () => {
    expect(isTaskIncomplete(complete)).toBe(false);
  });

  it('returns false for Done tasks regardless of missing fields', () => {
    expect(isTaskIncomplete({ ...complete, status: 'Done', hoursEstimated: 0 })).toBe(false);
  });

  it('returns true when hours missing', () => {
    expect(isTaskIncomplete({ ...complete, hoursEstimated: 0 })).toBe(true);
  });

  it('returns true when no assignees', () => {
    expect(isTaskIncomplete({ ...complete, assignees: [] })).toBe(true);
  });

  it('returns false for parent tasks (has children)', () => {
    global.window.tasks = [{ id: 'child', parentId: 't1' }];
    expect(isTaskIncomplete(complete)).toBe(false);
  });
});

describe('getItemType', () => {
  let getItemType;

  beforeAll(async () => {
    const m = await import(helpersUrl);
    getItemType = m.getItemType;
  });

  it('returns itemType when set', () => {
    expect(getItemType({ itemType: 'feature' })).toBe('feature');
  });

  it('defaults to task', () => {
    expect(getItemType({})).toBe('task');
  });
});

describe('aggHours', () => {
  let aggHours;

  beforeAll(async () => {
    const m = await import(helpersUrl);
    aggHours = m.aggHours;
  });

  beforeEach(() => {
    global.window.tasks = [
      { id: 'p', parentId: null, hoursSpent: 2, hoursEstimated: 5 },
      { id: 'c1', parentId: 'p', hoursSpent: 1, hoursEstimated: 3 },
      { id: 'c2', parentId: 'p', hoursSpent: 0, hoursEstimated: 2 },
    ];
  });

  it('sums hours for task and all descendants', () => {
    const result = aggHours('p');
    expect(result.spent).toBe(3);   // 2 + 1 + 0
    expect(result.est).toBe(10);    // 5 + 3 + 2
  });

  it('returns task own hours when no children', () => {
    const result = aggHours('c1');
    expect(result.spent).toBe(1);
    expect(result.est).toBe(3);
  });
});

describe('getFilteredTasks (basic)', () => {
  let getFilteredTasks;

  beforeAll(async () => {
    const m = await import(helpersUrl);
    getFilteredTasks = m.getFilteredTasks;
  });

  const tasks = [
    { id: 't1', title: 'Alpha', client: 'Acme', status: 'In progress', priority: 'High', healthState: 'Green', assignees: ['Alice'], parentId: null },
    { id: 't2', title: 'Beta', client: 'Acme', status: 'Done', priority: 'Low', healthState: 'Red', assignees: ['Bob'], parentId: null },
    { id: 't3', title: 'Gamma', client: 'Bravo', status: 'In progress', priority: 'Low', healthState: 'Green', assignees: ['Alice'], parentId: null },
  ];

  beforeEach(() => {
    global.window.tasks = tasks;
    global.window.currentView = 'dashboard';
    global.window.currentFilter = {};
    global.window._currentUser = null;
  });

  it('returns all tasks when no filters active', () => {
    expect(getFilteredTasks()).toHaveLength(3);
  });

  it('filters by client', () => {
    global.window.currentFilter = { client: 'Acme' };
    expect(getFilteredTasks()).toHaveLength(2);
  });

  it('filters by status array', () => {
    global.window.currentFilter = { status: ['In progress'] };
    expect(getFilteredTasks()).toHaveLength(2);
  });

  it('filters by search query', () => {
    global.window.currentFilter = { search: 'alpha' };
    expect(getFilteredTasks()).toHaveLength(1);
    expect(getFilteredTasks()[0].id).toBe('t1');
  });

  it('sorts by priority', () => {
    global.window.currentFilter = { sort: 'priority' };
    const sorted = getFilteredTasks();
    expect(sorted[0].priority).toBe('High');
  });
});
