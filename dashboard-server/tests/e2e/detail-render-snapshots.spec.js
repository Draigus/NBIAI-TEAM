// dashboard-server/tests/e2e/detail-render-snapshots.spec.js
//
// Characterisation snapshots for the two detail panel renderers.
// Captures HTML for a fixture task set covering every section branch.
// The renderer unification refactor must reproduce these bytes exactly.
//
// Regenerate baselines (ONLY when output is INTENTIONALLY changed):
//   UPDATE_DETAIL_SNAPSHOTS=1 npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { createTestUser } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

const SNAP_DIR = path.join(__dirname, 'snapshots', 'detail-render');
const UPDATE = process.env.UPDATE_DETAIL_SNAPSHOTS === '1';

// ---- Fixture dataset -------------------------------------------------
// Fixed UUIDs and ISO dates so output is deterministic. Covers:
//  root project w/ SoW+workType+repeat(weekly)+notes . feature w/ 10 children
//  blocked task w/ full blockerInfo . task w/ prereqs+dependents
//  root w/o client (client-select branch) . incomplete task (overlay banner)
//  story w/o children (manual dates, hours input, repeat yearly)
const FX = {
  knownClients: ['NBI Operations'],
  team: ['Glen Pryer', 'Tom Rieger'],
  // _teamsCache shape: findTeamForClientOrSow matches t.sow_id then t.client_id
  // (nbi-leads.js:972-982). client_id match is the live path here — fixture
  // tasks carry sowId (camelCase) while the overlay Team row passes task.sow_id.
  teams: [
    { id: 'te000000-0000-0000-0000-000000000001', name: 'CH Delivery Team', colour: '#44ff88', client_id: 'cccccccc-0000-0000-0000-000000000001', sow_id: null },
  ],
  leadsConfig: { stages: [], resourceTypes: [], fieldOptions: { work_type: ['Consulting', 'Development'] } },
  sows: [
    { id: 'aaaaaaaa-0000-0000-0000-00000000s001', title: 'CH Advisory SoW', client_id: 'cccccccc-0000-0000-0000-000000000001', client_name: 'Couch Heroes' },
    { id: 'aaaaaaaa-0000-0000-0000-00000000s002', title: 'Other Client SoW', client_id: 'cccccccc-0000-0000-0000-000000000002', client_name: 'Lighthouse' },
  ],
  clients: {
    'Couch Heroes': { id: 'cccccccc-0000-0000-0000-000000000001', name: 'Couch Heroes', has_active_work: true, hierarchy_levels: ['project', 'feature', 'story', 'task'] },
    'Lighthouse': { id: 'cccccccc-0000-0000-0000-000000000002', name: 'Lighthouse', has_active_work: true },
  },
  tasks: [
    { id: 't0000000-0000-0000-0000-000000000001', title: 'Root project <with> "escaping"', parentId: null, itemType: 'project',
      client: 'Couch Heroes', sowId: 'aaaaaaaa-0000-0000-0000-00000000s001', workType: 'Consulting', status: 'In progress',
      priority: 'High', healthState: 'Green', assignees: ['Glen Pryer'], hoursEstimated: 40, hoursSpent: 12,
      startDate: '2026-06-01', endDate: '', dueDate: '2026-08-01', description: 'A root project description over fifteen chars.',
      collaborations: 'Glen leads, Tom supports.', successFactor: 'Unified renderers shipped.',
      notes: [{ time: '2026-06-15T10:30:00.000Z', text: 'First note & <escaped>' }],
      repeatRule: { type: 'weekly', interval: 2, daysOfWeek: [1, 3] }, dependencies: [] },
    { id: 't0000000-0000-0000-0000-000000000002', title: 'Feature with ten children', parentId: 't0000000-0000-0000-0000-000000000001',
      itemType: 'feature', status: 'In progress', priority: 'Medium', healthState: 'Yellow', assignees: [],
      hoursEstimated: 0, hoursSpent: 0, startDate: '', endDate: '', dueDate: '', description: 'Feature exercising the children cap.',
      collaborations: '', successFactor: '', notes: [], dependencies: [] },
    // ten stories under the feature — exercises children>8 cap and auto-dates
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `t0000000-0000-0000-0000-0000000000${(10 + i).toString()}`,
      title: `Story ${i + 1}`, parentId: 't0000000-0000-0000-0000-000000000002', itemType: 'story',
      status: i < 3 ? 'Done' : i === 3 ? 'In progress' : 'Not started', priority: 'Low', healthState: '',
      assignees: [], hoursEstimated: 4, hoursSpent: i < 3 ? 4 : 0, sortOrder: i,
      startDate: `2026-06-${String(2 + i).padStart(2, '0')}`, endDate: '', dueDate: `2026-07-${String(2 + i).padStart(2, '0')}`,
      description: 'Story body long enough for validation.', collaborations: '', successFactor: '', notes: [], dependencies: [],
    })),
    { id: 't0000000-0000-0000-0000-000000000003', title: 'Blocked task', parentId: 't0000000-0000-0000-0000-000000000002',
      itemType: 'task', status: 'Blocked', priority: 'Urgent', healthState: 'Red', assignees: ['Tom Rieger'],
      hoursEstimated: 8, hoursSpent: 2, startDate: '2026-06-10', endDate: '', dueDate: '2026-07-10',
      description: 'Blocked task exercising blocker box.', collaborations: '', successFactor: '', notes: [],
      dependencies: ['t0000000-0000-0000-0000-000000000010'],
      blockerInfo: { blockedOn: 'Waiting on client sign-off', internal: ['Glen Pryer'], external: ['Vardis'],
        toUnblock: 'Chase sign-off', dateBlocked: '2026-06-20T09:00:00.000Z', lastUpdated: '2026-06-28T14:00:00.000Z' } },
    { id: 't0000000-0000-0000-0000-000000000004', title: 'Task with prereqs and dependents', parentId: 't0000000-0000-0000-0000-000000000002',
      itemType: 'task', status: 'Not started', priority: 'Medium', healthState: '', assignees: [],
      hoursEstimated: 6, hoursSpent: 0, startDate: '', endDate: '', dueDate: '2026-07-20',
      description: 'Exercises prerequisites and dependents lists.', collaborations: '', successFactor: '', notes: [],
      dependencies: ['t0000000-0000-0000-0000-000000000010', 't0000000-0000-0000-0000-000000000013'] },
    { id: 't0000000-0000-0000-0000-000000000005', title: 'Waiter on task four', parentId: 't0000000-0000-0000-0000-000000000002',
      itemType: 'task', status: 'Not started', priority: 'Low', healthState: '', assignees: [],
      hoursEstimated: 2, hoursSpent: 0, startDate: '', endDate: '', dueDate: '',
      description: 'Depends on task four for dependents list.', collaborations: '', successFactor: '', notes: [],
      dependencies: ['t0000000-0000-0000-0000-000000000004'] },
    { id: 't0000000-0000-0000-0000-000000000006', title: 'Rootless orphan project', parentId: null, itemType: 'project',
      client: '', status: 'Planning', priority: '', healthState: '', assignees: [], hoursEstimated: 0, hoursSpent: 0,
      startDate: '', endDate: '', dueDate: '', description: '', collaborations: '', successFactor: '', notes: [], dependencies: [] },
    { id: 't0000000-0000-0000-0000-000000000007', title: 'Story with yearly repeat', parentId: 't0000000-0000-0000-0000-000000000001',
      itemType: 'feature', status: 'Not started', priority: 'Low', healthState: '', assignees: ['Glen Pryer'],
      hoursEstimated: 10, hoursSpent: 0, startDate: '2026-09-01', endDate: '', dueDate: '2026-12-01',
      description: 'Feature without children: manual dates and hours input.', collaborations: '', successFactor: '', notes: [],
      repeatRule: { type: 'yearly', dates: ['2026-12-01', '2027-06-01'] }, dependencies: [] },
    // Initiative root — the ONLY type with VALID_PARENT_TYPE null (nbi-utils.js:151).
    // Exercises the overlay Move Under no-parent branch ("Projects are always at
    // the root level.", nbi-detail.js:264-267) which no other fixture reaches.
    { id: 't0000000-0000-0000-0000-000000000008', title: 'General', parentId: null, itemType: 'initiative',
      client: 'Couch Heroes', status: 'In progress', priority: '', healthState: '', assignees: [],
      hoursEstimated: 0, hoursSpent: 0, startDate: '', endDate: '', dueDate: '',
      description: 'Evergreen initiative root for branch coverage.', collaborations: '', successFactor: '', notes: [], dependencies: [] },
  ],
};

// Which fixture ids get snapshotted, with stable file keys
const CASES = [
  ['root-project', 't0000000-0000-0000-0000-000000000001'],
  ['feature-ten-children', 't0000000-0000-0000-0000-000000000002'],
  ['blocked-task', 't0000000-0000-0000-0000-000000000003'],
  ['prereqs-dependents', 't0000000-0000-0000-0000-000000000004'],
  ['rootless-no-client', 't0000000-0000-0000-0000-000000000006'],
  ['feature-no-children', 't0000000-0000-0000-0000-000000000007'],
  ['initiative-root', 't0000000-0000-0000-0000-000000000008'],
];

async function login(page, user) {
  await page.goto('/nbi_project_dashboard.html');
  await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
  await page.locator('#loginUser').fill(user.username);
  await page.locator('#loginPass').fill(user.raw_password);
  await page.locator('#loginBtn').click();
  await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });
  await page.waitForSelector('.sidebar__item', { state: 'attached', timeout: 15000 });
}

function checkSnapshot(key, html) {
  const file = path.join(SNAP_DIR, `${key}.html`);
  if (UPDATE) {
    fs.mkdirSync(SNAP_DIR, { recursive: true });
    fs.writeFileSync(file, html, 'utf8');
    return;
  }
  expect(fs.existsSync(file), `baseline missing: ${file} — run with UPDATE_DETAIL_SNAPSHOTS=1 once`).toBe(true);
  expect(html).toBe(fs.readFileSync(file, 'utf8'));
}

// Committed baselines encode rendered dates: notes use toLocaleString() with
// NO explicit locale (nbi-detail.js:186, nbi-kanban.js:215), so the browser
// locale/timezone MUST be pinned or baselines break on other machines.
test.use({ locale: 'en-GB', timezoneId: 'Europe/London' });

test.describe('detail renderer characterisation snapshots', () => {
  test.beforeAll(async () => { await truncate(); });

  test('both panels render byte-identical HTML for the fixture set', async ({ page }) => {
    const user = await createTestUser({ role: 'admin' });
    await login(page, user);

    await page.evaluate((fx) => {
      tasks = fx.tasks;
      _apiClientsCache = fx.clients;
      _sowsCache = fx.sows;
      _teamsCache = fx.teams;
      _leadsConfig = fx.leadsConfig;
      _cachedTeamMembers = fx.team;
      settings.knownClients = fx.knownClients;
    }, FX);

    for (const [key, id] of CASES) {
      const inline = await page.evaluate((tid) => renderInlineTaskDetail(tid), id);
      expect(inline.length, `inline render empty for ${key}`).toBeGreaterThan(500);
      checkSnapshot(`inline-${key}`, inline);

      // Synchronous capture: async loads (time entries, comments) cannot
      // interleave inside a single evaluate, so innerHTML is the pre-load HTML.
      const overlay = await page.evaluate((tid) => {
        openDetailOverlay(tid);
        return document.getElementById('detailPanel').innerHTML;
      }, id);
      expect(overlay.length, `overlay render empty for ${key}`).toBeGreaterThan(500);
      checkSnapshot(`overlay-${key}`, overlay);

      await page.evaluate(() => closeDetail());
    }
  });

  // Codex plan-review HIGH finding: the byte snapshots alone never prove the
  // two panels can coexist in the DOM or that the paired helpers hit the right
  // panel. This test drives the REAL path: inline panel via openDetail on the
  // Tasks view (viewport 1280 > 1024), overlay opened ON TOP via the inline
  // Expand button, then one paired helper exercised per panel against a real
  // DB task so writes go end-to-end.
  test('panels coexist in DOM with distinct ID namespaces and correctly-paired helpers', async ({ page }) => {
    const user = await createTestUser({ role: 'admin' });
    const { createTestTask } = require('../helpers/fixtures');
    const dbTask = await createTestTask({ title: 'Coexistence probe', item_type: 'initiative' });
    await login(page, user);

    await page.evaluate(async (tid) => {
      switchView('tasks');
      openDetail(tid);
    }, dbTask.id);
    await page.waitForSelector('#inlineDetailPanel .inline-detail', { state: 'attached', timeout: 10000 });

    // Open the overlay ON TOP via the real inline Expand button
    await page.click('#inlineDetailPanel [data-action="openDetailOverlay"]');
    await page.waitForSelector('#detailPanel.open', { state: 'attached', timeout: 10000 });

    // Both panels present simultaneously
    expect(await page.locator('#inlineDetailPanel .inline-detail').count()).toBe(1);
    expect(await page.locator('#detailPanel.open').count()).toBe(1);

    // Every duplicate-sensitive ID appears exactly once while both are open
    const SENSITIVE_IDS = [
      'noteInput', 'inlineNoteInput', 'logHours', 'inlineLogHours',
      'logDesc', 'inlineLogDesc', 'timeEntriesList', 'inlineTimeEntriesList',
      'detail-title', 'inline-detail-title', 'detail-status', 'inline-detail-status',
    ];
    for (const domId of SENSITIVE_IDS) {
      const n = await page.evaluate((x) => document.querySelectorAll(`[id="${x}"]`).length, domId);
      expect(n, `expected exactly one #${domId} with both panels open, found ${n}`).toBe(1);
    }

    // Paired helpers write through the correct panel's inputs.
    // Overlay note first (overlay is on top):
    await page.fill('#noteInput', 'overlay note');
    await page.click('#detailPanel [data-action="addNote"]');
    await page.waitForFunction((tid) =>
      (tasks.find(t => t.id === tid)?.notes || []).some(n => n.text === 'overlay note'), dbTask.id);
    // Close overlay, inline note second:
    await page.evaluate(() => closeDetail());
    await page.waitForSelector('#inlineDetailPanel .inline-detail', { state: 'attached', timeout: 10000 });
    await page.fill('#inlineNoteInput', 'inline note');
    await page.click('#inlineDetailPanel [data-action="addNoteInline"]');
    await page.waitForFunction((tid) =>
      (tasks.find(t => t.id === tid)?.notes || []).some(n => n.text === 'inline note'), dbTask.id);

    const noteTexts = await page.evaluate((tid) => (tasks.find(t => t.id === tid)?.notes || []).map(n => n.text), dbTask.id);
    expect(noteTexts).toEqual(['overlay note', 'inline note']);
  });
});
