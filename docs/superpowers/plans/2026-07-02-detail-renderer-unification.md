# Detail Panel Renderer Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the two detail panel renderers (`openDetailOverlay` in nbi-detail.js and `renderInlineTaskDetail` in nbi-kanban.js) via section-level extraction into shared `renderDetailSection<Name>(task, opts)` functions, with byte-identical output enforced by characterisation snapshots.

**Architecture:** Each shared section becomes one function in nbi-detail.js taking `(task, opts)` where opts carries the panel identity and ID prefix. The two panels become thin composition shells. Panel-specific SECTIONS (Comments, Move Under, incomplete banner = overlay-only) stay in their owning shell. Panel-specific FIELDS that live inside shared sections stay in the shared function behind `opts.panel` branches: the SoW selector (inline-only, inside Properties — see Task 3) and the Expand button (inline-only, inside Actions — see Task 10). A Playwright characterisation spec captures both panels' HTML for a fixture task set BEFORE any refactor; every task must reproduce those bytes exactly.

**Tech Stack:** Vanilla JS global-scope frontend (no modules, no build step), Playwright for the snapshot harness, Vitest for the existing unit suite.

**Plan convention — code-by-transform:** The section functions are MOVES of existing template literals, not new code. For each section this plan gives: the exact source line ranges in BOTH files (at commit `4408ed9`), the function signature, and a branch table listing every difference between the two panels' versions. Task 3 (Properties) shows the fully-worked pattern. Transcribing every literal into this plan would make the plan the source of truth instead of the code; the snapshot harness (Task 1) catches ANY divergence mechanically, including plan typos. If a snapshot diff appears, the committed baseline is right and your code is wrong — never regenerate baselines mid-task.

**Line number caveat:** ranges reference master at `4408ed9`. Task 2 shifts nbi-detail.js line numbers; ranges for Tasks 3–11 in nbi-detail.js refer to the body of `buildDetailOverlayHtml` after Task 2 (content is unchanged, offsets move). Locate by content, verify by snapshot.

---

## Context you need before starting

Read these first:
- `docs/HANDOFF.md` — the six breakage traps. Non-negotiable constraints.
- `dashboard-server/public/js/views/nbi-detail.js:77-291` — `openDetailOverlay`
- `dashboard-server/public/js/views/nbi-kanban.js:101-289` — accordion machinery, `renderInlineTaskDetail`, `inlineDetailSelect`

**Critical constraints (from handoff, verified in session D):**
1. Both panels can be in the DOM at once (inline "Expand" opens the overlay on top). ID namespaces `detail-*` and `inline-detail-*` must never merge.
2. Paired helpers are keyed to those IDs: `logTimeEntry`→`#logHours`/`#logDesc` vs `logTimeEntryInline`→`#inlineLogHours`/`#inlineLogDesc`; `loadTimeEntries`→`#timeEntriesList` vs `loadTimeEntriesInline`→`#inlineTimeEntriesList` (both loaders in nbi-import.js:1824-1877; the inline one is called after inline render at nbi-tasks.js:137); `addNote`→`#noteInput` vs `addNoteInline`→`#inlineNoteInput`.
3. Accordion state (`_accWrap`, `_accordionState`, `_accordionTaskId`) must be preserved exactly.
4. Attachments entity type: inline uses `isRoot ? 'project' : 'task'`, overlay always `'task'`. RESOLVED in session D: inline is correct (contract import wizard at nbi-import.js:116 stores under 'project'). Preserve the difference during unification (byte-identical); Task 15 fixes the overlay deliberately.
5. Children rows: inline uses `data-action="openDetail"`, overlay uses `data-action="openDetailOverlay"`. Keep per-panel.
6. Cache-busts: `nbi-kanban.js?v=6`, `nbi-detail.js?v=5` at nbi_project_dashboard.html:341-342. Bump both at the end.

**Pre-existing quirks to PRESERVE byte-identically (flag, don't fix):**
- `renderRepeatSection` embeds fixed IDs `detail-repeatFrequency` and `addRepeatDate_<id>` — collides when both panels are open. Out of scope.
- Overlay child rows colour on `c.healthState === 'Blocked'` (never true — HEALTH_STATES has no 'Blocked'); inline uses `c.status === 'Blocked'`. Preserve both as-is.
- Overlay `detailSelect` reads global `activeDetailTaskId`; inline `inlineDetailSelect` takes explicit taskId. The unified helper takes explicit taskId (identical output — `activeDetailTaskId === id` throughout the build).

**The opts contract (used by every section function):**
```js
// opts = {
//   panel: 'overlay' | 'inline',  // which shell is composing — branches on genuine behavioural differences
//   p: 'detail' | 'inline-detail' // element ID prefix — NEVER collapse the two namespaces
// }
```

---

### Task 1: Characterisation snapshot harness

**Files:**
- Create: `dashboard-server/tests/e2e/detail-render-snapshots.spec.js`
- Create: `dashboard-server/tests/e2e/snapshots/detail-render/` (baseline HTML files, committed)

The spec logs in (same pattern as `ats-workflow.spec.js`), injects a deterministic fixture dataset into the client globals, then captures:
- **Inline panel:** raw string from `renderInlineTaskDetail(id)`
- **Overlay panel:** `openDetailOverlay(id)` then `document.getElementById('detailPanel').innerHTML`, captured synchronously inside the same `page.evaluate` (async loads can't interleave; DOM normalisation applies equally to baseline and comparison, so equality is meaningful). This works BEFORE Task 2's extraction and validates the extraction itself through the real write path.

Baselines regenerate ONLY via `UPDATE_DETAIL_SNAPSHOTS=1`. Normal runs compare with `expect(current).toBe(baseline)` — byte-identical.

- [ ] **Step 1: Write the spec**

```js
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
```

- [ ] **Step 2: Capture baselines**

Run from `dashboard-server/` (PowerShell):
```powershell
$env:UPDATE_DETAIL_SNAPSHOTS = '1'; npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js; Remove-Item Env:UPDATE_DETAIL_SNAPSHOTS
```
Expected: PASS, 14 files created under `tests/e2e/snapshots/detail-render/` (7 inline-*, 7 overlay-*). The coexistence test also runs (it never touches snapshot files). Adjust the `createTestTask` call if the fixture helper's signature differs — read `tests/helpers/fixtures.js` first; the task MUST be a root initiative (root-level enforcement rejects other types).

- [ ] **Step 3: Sanity-check the baselines are real renders**

```powershell
Select-String -Path tests/e2e/snapshots/detail-render/overlay-root-project.html -Pattern 'detail-panel__header','Time Tracking','Move Under','Comments' | Measure-Object
Select-String -Path tests/e2e/snapshots/detail-render/inline-root-project.html -Pattern 'inline-detail__header','acc-time','Statement of Work' | Measure-Object
Select-String -Path tests/e2e/snapshots/detail-render/overlay-blocked-task.html -Pattern 'What is this blocked on' | Measure-Object
```
Expected: every pattern found (non-zero counts). ALSO open two baseline files and READ them — confirm the escaping fixture (`&lt;with&gt;`) rendered escaped, notes/repeat/children sections present. If any file is a stub or missing sections, the fixture injection failed — fix before proceeding.

- [ ] **Step 4: Verify compare mode is green**

Run: `npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js`
Expected: PASS (no UPDATE env var — compares against the files just written).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/detail-render-snapshots.spec.js tests/e2e/snapshots/detail-render/
git commit -m "test(detail): characterisation snapshots for both detail panel renderers"
```

### Task 2: Mechanical extraction of buildDetailOverlayHtml

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-detail.js:77-291`

Split `openDetailOverlay(id)` into a pure string builder + a caller that keeps every side effect. NO content changes to the HTML string.

- [ ] **Step 1: Extract the builder**

New function ABOVE `openDetailOverlay`:
```js
/** Build the full overlay panel HTML for a task. No DOM writes and no direct
 *  async loads — but NOT strictly pure: renderAttachmentsSection (called in
 *  the body) schedules setTimeout(loadEntityFiles, 50) as a side effect
 *  (nbi-settings.js:1088). Harmless when the HTML is never mounted — the
 *  loader getElementById()s its container and early-returns on null.
 *  Returns null if the task is unknown. */
function buildDetailOverlayHtml(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return null;
  // ... lines 87-276 of the original function body, verbatim:
  // children/hrs/isRoot consts, dpIncomplete block, every html += line,
  // ending with the closing `html += `</div>`;`
  return html;
}
```
The caller becomes:
```js
function openDetailOverlay(id) {
  const _savedScrollY = window.scrollY;
  const _savedMainScroll = (document.getElementById('mainContent') || {}).scrollTop || 0;
  activeDetailTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!_leadsConfig && !task.parentId) loadLeadsConfig().then(() => { if (activeDetailTaskId === id) openDetailOverlay(id); });
  const panel = document.getElementById('detailPanel');
  panel.innerHTML = buildDetailOverlayHtml(id);
  panel.classList.add('open');
  // ... rest of original lines 279-290 verbatim (overlay class, textarea autosize,
  // scroll restore rAF, loadTimeEntries(id), loadComments(id))
}
```
Note the duplicate `tasks.find` — deliberate; keeps the builder pure and the null-guard order identical.

- [ ] **Step 2: Snapshot check**

Run: `npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js`
Expected: PASS — byte-identical. If ANY diff: your extraction changed content. Fix the code, never the baseline.

- [ ] **Step 3: Commit**

```bash
git add public/js/views/nbi-detail.js
git commit -m "refactor(detail): extract buildDetailOverlayHtml string builder (mechanical)"
```

### Task 3: Unified select helper + Properties section (fully worked pattern)

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-detail.js` (add `detailSelectHtml` + `renderDetailSectionProperties`; use in builder)
- Modify: `dashboard-server/public/js/views/nbi-kanban.js` (use in `renderInlineTaskDetail`)

Source material: overlay = nbi-detail.js original lines 107-160 (+detailSelect at 508); inline = nbi-kanban.js:131-188 (+inlineDetailSelect at 285).

Branch table (every overlay/inline difference in Properties):
| Point | Overlay | Inline |
|---|---|---|
| ID prefix | `detail-` | `inline-detail-` |
| Team row (read-only) | present (dpClientObj/dpTeam block) | absent |
| SoW selector | absent | present, root items only |
| Everything else | identical modulo prefix | identical modulo prefix |

- [ ] **Step 1: Add the unified helpers to nbi-detail.js**

```js
/** Labelled select for either detail panel. opts.p supplies the element ID
 *  prefix — 'detail' (overlay) or 'inline-detail' (inline). The two ID
 *  namespaces must stay distinct: both panels can be in the DOM at once. */
function detailSelectHtml(label, field, value, options, taskId, opts, required) {
  const cls = 'detail-field__label' + (required ? ' field-required' : '');
  const selId = `${opts.p}-${field}`;
  return `<div class="detail-field"><label class="${cls}" for="${selId}">${label}</label><select id="${selId}" onchange="updateTask('${taskId}','${field}',this.value)">${options.map(o => `<option value="${esc(o)}" ${o===value?'selected':''}>${esc(o||'-- None --')}</option>`).join('')}</select></div>`;
}

/** Properties section shared by both detail panels. Includes the wrapping
 *  <div class="detail-section"> (identical in both panels). Overlay-only:
 *  Team row. Inline-only: SoW selector on root items. */
function renderDetailSectionProperties(task, opts) {
  const id = task.id;
  const p = opts.p;
  const client = getTaskClient(task);
  const isRoot = !task.parentId;
  let html = `<div class="detail-section"><div class="detail-section__title">Properties</div>`;
  html += `<div class="detail-field"><span class="detail-field__label">Type</span><div style="display:flex;align-items:center;gap:6px">${itemTypePillHtml(task)} <span style="font-size:0.82rem;color:var(--text-primary)">${getItemTypeLabel(task)}</span></div></div>`;
  html += `<div class="detail-field"><label class="detail-field__label field-required" for="${p}-title">Name</label><input id="${p}-title" value="${esc(task.title)}" oninput="_liveWrite('${id}','title',this.value)" onchange="updateTask('${id}','title',this.value)" onkeydown="if(event.key==='Enter')this.blur()"></div>`;
  if (client) {
    html += `<div class="detail-field"><span class="detail-field__label field-required">Client</span><div style="display:flex;align-items:center;gap:6px">${clientBadgeHtml(client)} <span style="font-size:0.82rem;color:var(--text-primary)">${esc(client)}</span></div></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label field-required" for="${p}-client">Client</label><select id="${p}-client" onchange="if(!this.value){this.value='${escAttrJs(task.client||'')}';toast('Every item must belong to a client.','warning');return;}updateTask('${id}','client',this.value)"><option value="" disabled>${task.client ? '' : '-- Select Client --'}</option>${getContractedClients().map(o => `<option value="${esc(o)}" ${(task.client||'')=== o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  }
  if (opts.panel === 'overlay') {
    // Team — read-only derived from the task's client/SoW. If the project's
    // client (or specific SoW) belongs to a team, surface it here so people
    // know who they're working with.
    const clientObj = client ? _apiClientsCache[client] : null;
    const team = findTeamForClientOrSow(clientObj?.id, task.sow_id);
    if (team) {
      const teamSwatch = team.colour ? `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${esc(team.colour)};margin-right:4px;vertical-align:middle"></span>` : '';
      html += `<div class="detail-field"><span class="detail-field__label">Team</span><div style="display:flex;align-items:center;gap:6px"><a href="#" data-action="openTeamDetailModal" data-prevent data-arg0="${team.id}" style="font-size:0.82rem;color:var(--accent-text);text-decoration:none">${teamSwatch}${esc(team.name)}</a></div></div>`;
    }
  }
  html += detailSelectHtml('Status', 'status', task.status, STATUSES, id, opts, true);
  if (task.status === 'Blocked') html += blockerDetailBoxHtml(task, id);
  html += detailSelectHtml('Priority', 'priority', task.priority || '', ['', ...PRIORITIES], id, opts, true);
  html += detailSelectHtml('Health', 'healthState', task.healthState || '', ['', ...HEALTH_STATES], id, opts);
  html += `<div class="detail-field"><span class="detail-field__label">Assignee</span>${assigneeSelectHtml(id, task.assignees)}</div>`;
  // Practice (Phase 9, a6c82c8c). Unset means "inherit from parent project"
  // for the sidebar filter. Read both camelCase (sync/load) and snake_case
  // (REST) for compatibility.
  html += (function() {
    const cur = task.practiceArea || task.practice_area || '';
    return `<div class="detail-field"><label class="detail-field__label" for="${p}-practice">Practice</label><select id="${p}-practice" onchange="updateTask('${id}','practiceArea',this.value||null)"><option value="">-- Inherit / None --</option>${PRACTICES.map(pr => `<option value="${esc(pr.value)}" ${cur === pr.value ? 'selected' : ''}>${esc(pr.label)}</option>`).join('')}</select></div>`;
  })();
  html += (function() {
    if (task.parentId) return '';
    const cur = task.workType || '';
    const config = _leadsConfig;
    const opts2 = config && config.fieldOptions
      ? (config.fieldOptions.work_type || []).map(o => typeof o === 'string' ? o : o.value)
      : [];
    return `<div class="detail-field"><label class="detail-field__label" for="${p}-workType">Work Type</label><select id="${p}-workType" onchange="updateTask('${id}','workType',this.value||null)"><option value="">-- None --</option>${opts2.map(v => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>`;
  })();
  if (opts.panel === 'inline' && isRoot) {
    // SoW selector (bug cb32b7f9). Only shown on root tasks (projects) — child
    // tasks inherit the parent's SoW via the tree grouping. Filters the SoW
    // list to the task's client so PMs don't see irrelevant SoWs.
    html += (function() {
      const curSow = task.sowId || task.sow_id || '';
      const taskClient = getTaskClient(task);
      const clientId = taskClient ? (_apiClientsCache[taskClient] && _apiClientsCache[taskClient].id) : null;
      const scopedSows = clientId ? _sowsCache.filter(s => s.client_id === clientId) : _sowsCache;
      return `<div class="detail-field"><label class="detail-field__label" for="${p}-sow">Statement of Work</label><select id="${p}-sow" onchange="updateTask('${id}','sowId',this.value||null)"><option value="">-- No SoW --</option>${scopedSows.map(s => `<option value="${esc(s.id)}" ${curSow === s.id ? 'selected' : ''}>${esc(s.title)}${s.client_name && !clientId ? ' (' + esc(s.client_name) + ')' : ''}</option>`).join('')}</select></div>`;
    })();
  }
  const iType = getItemType(task);
  const datesAuto = (iType === 'feature' || iType === 'story') && getChildren(task.id).length > 0;
  if (datesAuto) {
    const range = computeDateRange(id);
    html += `<div class="detail-field"><label class="detail-field__label">Start Date</label><input type="date" value="${range.start}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">Due Date</label><input type="date" value="${range.dueDate}" disabled title="Auto-calculated from child items"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label">End Date</label><input type="date" value="${range.endDate}" disabled title="Set when all children are complete"></div>`;
  } else {
    html += `<div class="detail-field"><label class="detail-field__label" for="${p}-startDate">Start Date</label><input id="${p}-startDate" type="date" value="${task.startDate||''}" onchange="updateTask('${id}','startDate',this.value)"></div>`;
    html += `<div class="detail-field"><label class="detail-field__label" for="${p}-endDate">End Date</label><input id="${p}-endDate" type="date" value="${task.endDate||''}" onchange="updateTask('${id}','endDate',this.value)"></div>`;
  }
  html += `<div class="detail-field"><label class="detail-field__label" for="${p}-dueDate">Due Date</label><input id="${p}-dueDate" type="date" value="${task.dueDate||''}" onchange="updateTask('${id}','dueDate',this.value)"></div>`;
  html += renderRepeatSection(task);
  html += `</div>`;
  return html;
}
```
IMPORTANT byte-check on this code: the overlay's date-field ids were `detail-startDate`/`detail-endDate`/`detail-dueDate` and inline's were `inline-detail-startDate`/etc. `${p}-startDate` reproduces both exactly. Same for every other `${p}-` id. The inner IIFE variable renamed `opts`→`opts2` to avoid shadowing — output unaffected (it's a local).

- [ ] **Step 2: Use it in both builders**

In `buildDetailOverlayHtml`: replace original lines 107-160 (from `const dpClient = getTaskClient(task);` + `html += `<div class="detail-section">...Properties...` through `html += renderRepeatSection(task); html += `</div>`;`) with:
```js
  html += renderDetailSectionProperties(task, { panel: 'overlay', p: 'detail' });
```
In `renderInlineTaskDetail` (nbi-kanban.js): replace lines 131-188 equivalently with:
```js
  html += renderDetailSectionProperties(task, { panel: 'inline', p: 'inline-detail' });
```
Do NOT delete `detailSelect`/`inlineDetailSelect` yet (Task 11 confirms zero callers first).

- [ ] **Step 3: Snapshot check** — `npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js` → PASS byte-identical.

- [ ] **Step 4: Commit**

```bash
git add public/js/views/nbi-detail.js public/js/views/nbi-kanban.js
git commit -m "refactor(detail): unified Properties section renderer (byte-identical)"
```

### Tasks 4–10: Remaining shared sections (same pattern as Task 3)

One task per section, each ending with snapshot check + commit. For each: extract from the overlay source (line refs = original `4408ed9` content now inside `buildDetailOverlayHtml`) and the inline source (nbi-kanban.js line refs), branch on `opts.panel` per the table. **The section function returns the section's full HTML as each panel currently emits it** — including the `<div class="detail-section">` wrapper for the overlay vs bare body for the inline accordion, per the wrapper column below. Where the wrapper differs, the function returns the BODY and each shell applies its own wrapper (`detail-section` div vs `_accWrap`).

| Task | Section | Overlay src | Inline src | Returns | Branch points (overlay vs inline) |
|---|---|---|---|---|---|
| 4 | Time Tracking | 162-174 | 190-201 | body only; overlay shell wraps in `detail-section` + title, inline shell wraps `_accWrap('time','Time Tracking',body,true)` | detail-agg: no style attr vs `style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:8px"`. Hours Spent row: absent vs present (children>0). Hours Est ids: `detail-hoursEstimated` vs `inline-detail-hoursEstimated` (=`${p}-hoursEstimated`). Log inputs: `logHours`/`logDesc` vs `inlineLogHours`/`inlineLogDesc`; action `logTimeEntry` vs `logTimeEntryInline`. List: `timeEntriesList` max-height:150px vs `inlineTimeEntriesList` max-height:120px |
| 5 | Description group (Description+Collaborations+SuccessFactor) | 176-182 | 204-211 | the three `detail-section` divs (IDENTICAL in both panels — no branches) | none — pure share. Inline shell wraps in `_accWrap('desc','Description',body,false)` |
| 6 | Notes | 184-187 | 213-217 | body (note-list + input row); overlay shell wraps `detail-section` + title "Notes", inline shell wraps `_accWrap('notes','Notes'+count,body,false)` | note-list markup identical. Input id `noteInput` vs `inlineNoteInput`; inline input has `onkeydown` Enter handler, overlay does not; action `addNote` vs `addNoteInline` |
| 7 | Attachments | 189-190 | 219-223 | `renderAttachmentsSection(entityType, task.id)` where entityType = overlay: `'task'`, inline: `isRoot ? 'project' : 'task'` (PRESERVE — Task 15 changes overlay deliberately) | wrapper: overlay emits bare; inline wraps `_accWrap('attach', attTitle, ..., true)` with the count-span title |
| 8 | Prerequisites + Dependents | 192-218 (two sections) | 226-246 (one accordion) | TWO functions: `renderDetailSectionPrerequisites(task, opts)` and `renderDetailSectionDependents(task, opts)`, each returning list rows only | prereq rows: font-size 0.78/padding 3px + status span + add-select `#addDepSelect` + `removeDependency` (overlay) vs 0.75/2px, no status span, no add UI, `_actStopRemoveDepAndRender` (inline). **Prereq EMPTY STATE differs too:** overlay `No prerequisites` with `font-size:0.78rem;padding:4px 0` vs inline `None` with `font-size:0.75rem;padding:2px 0`. Dependents: overlay separate section w/ empty-state text (`Nothing depends on this item`); inline heading-inside-accordion only when >0, NO empty state. Titles/count badges composed by shells |
| 9 | Children | 225-246 | 248-270 | body (progress bar + rows + add button); shells wrap | child rows: overlay has `itemTypeBadgeHtml(c)`, action `openDetailOverlay`, colour `c.healthState === 'Blocked'`, no cap; inline has no badge, action `openDetail`, colour `c.status === 'Blocked'`, `.slice(0,8)` + "+N more". Add-child button identical. Section emitted only when `children.length > 0 \|\| childType` (both panels) |
| 10 | Actions | 270-274 | 272-278 | full section div | overlay: container `style="display:flex;gap:8px;margin-top:12px"`, labels `Duplicate ${getItemTypeLabel(task)}`/`Delete ${getItemTypeLabel(task)}`, no per-button font-size. inline: container `style="display:flex;gap:8px"`, Expand button first (`data-action="openDetailOverlay"`), labels `Duplicate`/`Delete`, each button `style="font-size:0.75rem"` |

Steps for EACH of tasks 4-10:
- [ ] Extract the function into nbi-detail.js above `buildDetailOverlayHtml`, moving the overlay literal and adding `opts.panel === 'inline'` branches that reproduce the inline literal exactly
- [ ] Replace the corresponding block in `buildDetailOverlayHtml` AND in `renderInlineTaskDetail`
- [ ] Run `npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js` → PASS byte-identical (fix code, never baselines)
- [ ] Commit: `git commit -m "refactor(detail): unified <Section> section renderer (byte-identical)"`

### Task 11: Move the inline renderer home + delete dead helpers

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-kanban.js` (remove lines 101-289: accordion machinery, `renderInlineTaskDetail`, `inlineDetailSelect`)
- Modify: `dashboard-server/public/js/views/nbi-detail.js` (receive them)

- [ ] **Step 1:** Move `toggleDetailSection`, `_accordionState`, `_accordionTaskId`, `_accWrap`, and `renderInlineTaskDetail` verbatim from nbi-kanban.js into nbi-detail.js (place above `buildDetailOverlayHtml`). Script load order (kanban before detail) is irrelevant — all calls are runtime, all declarations global. Leave behaviour handlers (`addNoteInline`, `deleteNote`) in nbi-kanban.js — out of scope.
- [ ] **Step 2:** Verify `detailSelect` and `inlineDetailSelect` have zero remaining callers: `grep -rn "detailSelect(\|inlineDetailSelect(" public/js/` — expect only definition lines. Delete both functions.
- [ ] **Step 3:** `npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js` → PASS.
- [ ] **Step 4:** Run FULL unit suite: `npm test` → green (matches the post-pool-fix baseline).
- [ ] **Step 5:** Commit: `git commit -m "refactor(detail): move inline renderer to nbi-detail.js, delete dead select helpers"`

### Task 12: Cache-bust bump

**Files:**
- Modify: `nbi_project_dashboard.html:341-342`

- [ ] **Step 1:** `nbi-kanban.js?v=6` → `?v=7`; `nbi-detail.js?v=5` → `?v=6`.
- [ ] **Step 2:** Commit: `git commit -m "chore(detail): cache-bust nbi-kanban v7, nbi-detail v6"`

### Task 13: Full verification + Codex review

- [ ] **Step 1:** `npm run test:all` from `dashboard-server/` → unit AND e2e green. Paste the summary lines into the session log.
- [ ] **Step 2:** From the worktree: `codex review --base master`. Read the full output file (`tmpcodex_*.md`).
- [ ] **Step 3:** Fix EVERY finding at every severity (no deferrals), re-run snapshots + `npm run test:all` after fixes, commit fixes.
- [ ] **Step 4:** Run `node .claude/harness/lib/finish-task.js` and include its output when reporting.

### Task 14: Merge + deploy + Glen UAT

- [ ] **Step 1:** Use superpowers:finishing-a-development-branch — merge `feature/detail-renderer-unification` into master.
- [ ] **Step 2:** `pm2 restart nbi-dashboard`.
- [ ] **Step 3:** Playwright visual pass against :8888 on BOTH panels (inline side panel on Tasks view wide screen; overlay via Expand and via a non-Tasks view).
- [ ] **Step 4:** Ask Glen to UAT at https://worksage.nbi-consulting.com — both panels, plus one edit round-trip in each (change status inline, log time in overlay).

### Task 15: Overlay attachments entity-type fix (DELIBERATE behaviour change — after Task 14 lands)

The overlay's always-`'task'` hides contract/project attachments on root items (stored under `'project'` by nbi-import.js:116 and by the inline panel). Fix = overlay adopts `isRoot ? 'project' : 'task'` — a one-line opts change in `renderDetailSectionAttachments` thanks to Task 7.

- [ ] **Step 1:** Quantify BOTH sides in prod (read-only). First: root-item attachments stranded under 'task' (rows the fix would orphan from the overlay unless migrated):
```sql
SELECT COUNT(*) FROM attachments a JOIN tasks t ON t.id::text = a.entity_id
WHERE a.entity_type = 'task' AND t.parent_id IS NULL;
```
Second: attachments currently INVISIBLE to the overlay that the fix makes visible (quantifies the behavioural change itself):
```sql
SELECT COUNT(*) FROM attachments a JOIN tasks t ON t.id::text = a.entity_id
WHERE a.entity_type = 'project' AND t.parent_id IS NULL;
```
- [ ] **Step 2:** Report the count to Glen with the recommendation: change overlay to root-aware entity type; if count > 0, migration 076 reassigns those rows to `entity_type='project'`. **GATE: migration requires Glen's explicit approval — do not write it before he agrees.**
- [ ] **Step 3 (after approval):** flip the overlay branch in `renderDetailSectionAttachments`, regenerate ONLY the affected overlay baselines with `UPDATE_DETAIL_SNAPSHOTS=1` (this is the single sanctioned baseline regeneration — the diff must show ONLY the attachments entity-type change), add migration 076 if approved, `npm run test:all`, commit, PM2 restart, Glen UAT on a root item with a contract attachment.

---

## Self-review notes

- Spec coverage: all 9 shared sections from the handoff have tasks (Properties=3, Time=4, Description=5, Notes=6, Attachments=7, Prereqs+Dependents=8, Children=9, Actions=10); panel-specific sections (Comments, Move Under, incomplete banner, SoW, Expand) explicitly stay in shells; move-to-detail.js = Task 11; cache-busts = Task 12; characterisation-first = Task 1; byte-identical gate on every task.
- Handoff traps: #1 idPrefix (opts.p), #2 paired helpers (branch tables name every id/action pair), #3 accordion preserved (moved verbatim, shells keep _accWrap calls), #4 attachments preserved then fixed deliberately (Task 15), #5 children actions per-panel (Task 9 table), #6 cache-busts (Task 12).
- Type consistency: `detailSelectHtml(label, field, value, options, taskId, opts, required)` used consistently; opts is always `{ panel, p }`.
- Known deviation from writing-plans letter: Tasks 4-10 specify moves by line-range + branch table instead of transcribed literals — rationale in the header ("code-by-transform").

## Codex adversarial review round 1 (2026-07-03, GPT-5.5)

9 findings (2 high, 7 medium), ALL fixed in this document: (1) playwright commands now pass `--config=tests/e2e/playwright.config.js`; (2) coexistence + paired-helper test added to the spec; (3) `_teamsCache` fixture added so the overlay Team row is snapshotted; (4) initiative-root fixture case added for the Move Under no-parent branch; (5) builder purity claim corrected (renderAttachmentsSection schedules a timer); (6) prereq empty-state difference added to Task 8 table and `loadTimeEntriesInline` named correctly in constraint 2; (7) architecture statement no longer contradicts Task 3 on SoW placement; (8) Playwright locale/timezone pinned (`en-GB` / `Europe/London`); (9) Task 15 gained the second query quantifying attachments the fix makes visible. Raw review: tmpcodex_plan_review.md.
