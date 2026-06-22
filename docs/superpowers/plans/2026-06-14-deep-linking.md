# Deep Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL deep-links for tasks, candidates, leads, and bugs so users can share direct links to specific entities.

**Architecture:** Capture the initial hash before the sidebar's IIFE clobbers it (nbi-sidebar.js:715-721). After auth completes and the parent view renders, resolve the pending deep-link by opening the entity's detail panel. Each detail open/close updates the hash. Back button closes the panel.

**Tech Stack:** Vanilla JS (no build step), existing hash routing in nbi-sidebar.js

**Codex review reference:** d:\tmp\codex_deep_link_review.md (verified against actual codebase)
**Codex red team reference:** d:\tmp\codex_deep_link_redteam.md (9 findings, all addressed below)

---

### Task 1: Capture initial hash before sidebar clobbers it

**Files:**
- Modify: `dashboard-server/public/js/nbi-sidebar.js:714-721`

The sidebar IIFE at line 715 recognises only known view names, then line 721 calls `history.replaceState()` which overwrites the hash. A deep-link hash like `#task/uuid` would be destroyed before auth completes.

- [ ] **Step 1: Add entity hash detection to the IIFE**

In `nbi-sidebar.js`, replace the IIFE at lines 715-721:

```javascript
// Restore view from URL hash on page load (supports deep-linking e.g. #bugs, #leads, #task/{id})
// RED-TEAM FIX: must be var (not let) so it attaches to window — Task 6 reads window._pendingDeepLink
var _pendingDeepLink = null;
(function() {
  const h = window.location.hash.replace('#', '');
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue','reporting','documentation','workload','hiring','commandcentre'];
  if (h && known.includes(h)) {
    currentView = LEGACY_ROUTES[h] || h;
  } else {
    const ENTITY_ROUTES = {
      'task': 'tasks',
      'hiring/candidate': 'hiring',
      'lead': 'leads',
      'bug': 'bugs'
    };
    for (const [prefix, view] of Object.entries(ENTITY_ROUTES)) {
      if (h.startsWith(prefix + '/')) {
        const entityId = h.slice(prefix.length + 1);
        if (entityId.length >= 8) {
          _pendingDeepLink = { type: prefix.replace('hiring/', ''), id: entityId, view };
          currentView = view;
        }
        break;
      }
    }
  }
})();
// Set initial history state
history.replaceState({ view: currentView, filter: { ...currentFilter }, taskSubView }, '', '#' + currentView);
```

- [ ] **Step 2: Verify no JS errors on page load**

Open http://localhost:8888/nbi_project_dashboard.html in browser, check console for errors.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/js/nbi-sidebar.js
git commit -m "feat(deep-link): capture entity hash before sidebar normalises it"
```

---

### Task 2: Add requireTaskAccess to GET /api/tasks/:id

**Files:**
- Modify: `dashboard-server/routes/tasks.js:109-123`
- Create: `dashboard-server/tests/unit/task-access.test.mjs`

Codex flagged that `GET /api/tasks/:id` has no `requireTaskAccess` call, unlike PATCH (line 222). Client users could fetch any task by UUID. Deep-linking makes this endpoint more prominent, so fix it now. RED-TEAM FIX: no `tasks.test.mjs` exists — create a new focused test file.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/task-access.test.mjs`:

```javascript
it('GET /api/tasks/:id returns 403 for client user accessing another client task', async () => {
  // Create a task for client A, then try to GET it as client B user
  const clientA = await createTestClient({ name: 'DeepLink Client A' });
  const clientB = await createTestClient({ name: 'DeepLink Client B' });
  const clientBUser = await createTestUser({ role: 'member', client_id: clientB.id });
  const clientBToken = await mintSession(clientBUser.id);
  const task = await createTestTask({ client_id: clientA.id, title: 'Secret A task' });
  const res = await request(app)
    .get(`/api/tasks/${task.id}`)
    .set('Authorization', `Bearer ${clientBToken}`);
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/task-access.test.mjs -t "returns 403 for client user"`
Expected: FAIL (currently returns 200)

- [ ] **Step 3: Add requireTaskAccess to the GET route**

In `routes/tasks.js`, modify the GET handler at line 109:

```javascript
/** GET /api/tasks/:id — Get a single task with notes, client name and SoW title */
router.get('/api/tasks/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const allowed = await requireTaskAccess(req, res, req.params.id);
  if (!allowed) return;
  const { rows } = await pool.query(`
    SELECT t.*, c.name as client_name,
      s.title AS sow_title, s.status AS sow_status,
      (SELECT json_agg(json_build_object('id', n.id, 'text', n.text, 'author', n.author, 'created_at', n.created_at) ORDER BY n.created_at)
       FROM task_notes n WHERE n.task_id = t.id) as notes
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    LEFT JOIN sows s ON s.id = t.sow_id
    WHERE t.id = $1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/task-access.test.mjs -t "returns 403 for client user"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/tasks.js dashboard-server/tests/unit/task-access.test.mjs
git commit -m "fix(security): add requireTaskAccess to GET /api/tasks/:id"
```

---

### Task 3: Add GET /api/bug-reports/:id endpoint

**Files:**
- Modify: `dashboard-server/routes/bugs.js`
- Test: `dashboard-server/tests/unit/bugs.test.mjs` (existing or create)

Currently `openBugDetail()` only works from cached list data (`_bugReportsData.reports.find()`). Deep-linking needs a single-record fetch. The list endpoint at line 41 shows the query pattern and client scoping.

- [ ] **Step 1: Write the failing test**

```javascript
it('GET /api/bug-reports/:id returns the bug report', async () => {
  const res = await request(app)
    .get(`/api/bug-reports/${bugId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(bugId);
  expect(res.body.title).toBeDefined();
});

it('GET /api/bug-reports/:id returns 404 for missing UUID', async () => {
  const res = await request(app)
    .get('/api/bug-reports/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/bugs.test.mjs -t "GET /api/bug-reports/:id"`
Expected: FAIL (404 — route doesn't exist)

- [ ] **Step 3: Add the GET endpoint**

In `routes/bugs.js`, after the POST handler (around line 94), add:

RED-TEAM FIX: bugs.js does NOT import `getClientScopes`. Client scoping uses `req.user?.clientId` and column `reporter_client_id` (not `client_id`). Mirrors existing list endpoint at line 48.

```javascript
/** GET /api/bug-reports/:id — Get a single bug report by ID */
router.get('/api/bug-reports/:id', async (req, res) => {
  if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
  let query = `SELECT b.id, b.user_id, b.type, b.title, b.description, b.page,
    b.status, b.priority, b.position, b.created_at, b.updated_at,
    b.source, b.reporter_client_id,
    (b.screenshot IS NOT NULL) AS has_screenshot,
    u.display_name AS reporter_name,
    rc.name AS reporter_client_name,
    (SELECT COUNT(*) FROM bug_report_comments c WHERE c.report_id = b.id)::int AS comment_count
    FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id
    LEFT JOIN clients rc ON b.reporter_client_id = rc.id
    WHERE b.id = $1`;
  const params = [req.params.id];
  if (req.user?.clientId) {
    query += ` AND b.reporter_client_id = $2`;
    params.push(req.user.clientId);
  }
  const { rows } = await pool.query(query, params);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/bugs.test.mjs -t "GET /api/bug-reports/:id"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/routes/bugs.js dashboard-server/tests/unit/bugs.test.mjs
git commit -m "feat(bugs): add GET /api/bug-reports/:id for deep-link resolution"
```

---

### Task 4: Make openBugDetail() work from API fetch

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-bugs.js:628-635`

Currently line 633-635 does `reports.find(x => x.id === id)` and returns if not found. For deep-links, the bug may not be in the cached list (different filter, first load). Fetch from the new API endpoint if not cached.

- [ ] **Step 1: Modify openBugDetail to fetch from API on cache miss**

In `nbi-bugs.js`, replace lines 628-635:

```javascript
async function openBugDetail(id) {
  const overlay = document.getElementById('bugDetailOverlay');
  const panel = document.getElementById('bugDetailPanel');
  if (!overlay || !panel) return;

  const reports = (_bugReportsData && _bugReportsData.reports) || [];
  let r = reports.find(x => x.id === id);
  if (!r) {
    try { r = await apiCall('/api/bug-reports/' + id); } catch (e) { /* not found */ }
  }
  // RED-TEAM FIX: clean up entity hash on failed fetch so URL doesn't stay on a dead link
  if (!r) { toast('Bug report not found', 'error'); _clearEntityHash(); return; }
```

- [ ] **Step 2: Verify existing bug detail still works from the list**

Open bugs view, click a bug report, confirm detail panel opens normally.

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/public/js/domains/nbi-bugs.js
git commit -m "feat(bugs): openBugDetail falls back to API fetch for deep-links"
```

---

### Task 5: Hash updates on detail open/close

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-detail.js:53,514`
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js:3465,3768` (openCandidateDetail, closeCandidateDetail)
- Modify: `dashboard-server/public/js/domains/nbi-leads.js` (openLeadDetail, closeLeadDetail)
- Modify: `dashboard-server/public/js/domains/nbi-bugs.js:628,751`

Each detail open pushes a history entry; each close replaces back to the parent view.

- [ ] **Step 1: Add hash helper functions to nbi-sidebar.js**

Add after the `_pendingDeepLink` declaration:

RED-TEAM FIX: added `_isPopstateNav` guard so close handlers don't call `_clearEntityHash()` during popstate (which would corrupt the history entry the browser just navigated to).

```javascript
var _isPopstateNav = false;
function _pushEntityHash(prefix, id) {
  const hash = '#' + prefix + '/' + id;
  history.pushState({ view: currentView, filter: { ...currentFilter }, taskSubView, entityHash: hash }, '', hash);
}
function _clearEntityHash() {
  if (_isPopstateNav) return;
  history.replaceState({ view: currentView, filter: { ...currentFilter }, taskSubView }, '', '#' + currentView);
}
```

- [ ] **Step 2: Wire task detail open/close**

RED-TEAM FIX: `openDetail()` has TWO return paths — inline desktop (returns at line 70) and overlay. The hash push must go before BOTH returns, not after. Place it right after `activeDetailTaskId = id;` at line 58, before the branch:

```javascript
activeDetailTaskId = id;
_pushEntityHash('task', id);
```

In `closeDetail()` (line 514), add before `_softReRender()`:

```javascript
_clearEntityHash();
```

- [ ] **Step 3: Wire candidate detail open/close**

In `nbi-hiring.js`, at the end of `openCandidateDetail()` (after the panel opens), add:

```javascript
_pushEntityHash('hiring/candidate', id);
```

In `closeCandidateDetail()` (line 3768), add before the overlay hide:

```javascript
_clearEntityHash();
```

- [ ] **Step 4: Wire lead detail open/close**

In `nbi-leads.js`, at the end of `openLeadDetail()`, add:

```javascript
_pushEntityHash('lead', id);
```

In `closeLeadDetail()` (line 1400), add at the start:

```javascript
_clearEntityHash();
```

- [ ] **Step 5: Wire bug detail open/close**

In `nbi-bugs.js`, at the end of `openBugDetail()`, add:

```javascript
_pushEntityHash('bug', id);
```

In `closeBugDetail()` (line 751), add at the start:

```javascript
_clearEntityHash();
```

- [ ] **Step 6: Extend popstate handler to close detail panels on Back**

In `nbi-sidebar.js`, modify the `popstate` handler at line 696:

```javascript
window.addEventListener('popstate', e => {
  if (e.state && e.state.view) {
    const prevView = currentView;
    currentView = LEGACY_ROUTES[e.state.view] || e.state.view;
    if (!isClientAllowedView(currentView)) currentView = 'dashboard';
    if (e.state.filter) {
      currentFilter = e.state.filter;
      if (currentFilter.status && typeof currentFilter.status === 'string') currentFilter.status = [currentFilter.status];
      if (currentFilter.health && typeof currentFilter.health === 'string') currentFilter.health = [currentFilter.health];
      if (currentFilter.assignee && typeof currentFilter.assignee === 'string') currentFilter.assignee = [currentFilter.assignee];
      if (!Array.isArray(currentFilter.status)) currentFilter.status = [];
      if (!Array.isArray(currentFilter.health)) currentFilter.health = [];
      if (!Array.isArray(currentFilter.assignee)) currentFilter.assignee = [];
    }
    taskSubView = e.state.taskSubView || 'tree';
    // RED-TEAM FIX: set guard so close handlers don't call _clearEntityHash during popstate
    _isPopstateNav = true;
    // If navigating away from an entity hash, close any open detail panel
    if (!e.state.entityHash) {
      if (activeDetailTaskId) closeDetail();
      closeBugDetail();
      closeCandidateDetail();
      closeLeadDetail();
    } else if (e.state.entityHash) {
      // Navigating to a different entity via back/forward
      const hash = e.state.entityHash.replace('#', '');
      _resolveEntityHash(hash);
      return;
    }
    _isPopstateNav = false;
    renderAll();
  }
});
```

- [ ] **Step 7: Remove old hashchange candidate handler**

In `nbi-import.js`, remove the `#hiring/candidate/` handler at lines 1352-1362 (it will be superseded by the new system):

```javascript
// Remove this block — replaced by deep-link system in nbi-sidebar.js
// window.addEventListener('hashchange', () => {
//   const hash = window.location.hash;
//   if (hash.startsWith('#hiring/candidate/')) { ... }
// });
```

Keep the `#interview/` handler intact — that's a separate flow.

- [ ] **Step 8: Verify opening/closing a task detail updates the URL bar**

Open http://localhost:8888/nbi_project_dashboard.html#tasks, click a task, confirm URL changes to `#task/{uuid}`. Close the panel, confirm URL reverts to `#tasks`. Press Back, confirm panel reopens.

- [ ] **Step 9: Commit**

```bash
git add dashboard-server/public/js/nbi-sidebar.js dashboard-server/public/js/views/nbi-detail.js dashboard-server/public/js/domains/nbi-hiring.js dashboard-server/public/js/domains/nbi-leads.js dashboard-server/public/js/domains/nbi-bugs.js dashboard-server/public/js/nbi-import.js
git commit -m "feat(deep-link): hash updates on detail open/close for all entity types"
```

---

### Task 6: Deep-link resolution after auth

**Files:**
- Modify: `dashboard-server/public/js/nbi-sidebar.js`
- Modify: `dashboard-server/public/js/nbi-api.js` (post-auth hook)

After login or session restore, if `_pendingDeepLink` is set, switch to the parent view and open the entity's detail panel once the view has rendered and data is available.

- [ ] **Step 1: Add the resolver function to nbi-sidebar.js**

Add after the hash helper functions:

RED-TEAM FIX: double `requestAnimationFrame` is not a reliable readiness gate. Task detail depends on `tasks` array being populated; hiring/lead views load data async. Use a polling retry (max 2s) that checks whether the view's DOM is ready before opening.

```javascript
function _resolveEntityHash(hash) {
  const ENTITY_ROUTES = { 'task': 'tasks', 'hiring/candidate': 'hiring', 'lead': 'leads', 'bug': 'bugs' };
  for (const [prefix, view] of Object.entries(ENTITY_ROUTES)) {
    if (hash.startsWith(prefix + '/')) {
      const id = hash.slice(prefix.length + 1);
      const type = prefix.replace('hiring/', '');
      _resolveDeepLink({ type, id, view });
      return;
    }
  }
}

function _resolveDeepLink(link) {
  if (!link) return;
  if (currentView !== link.view) switchView(link.view);
  var attempts = 0;
  var maxAttempts = 20;
  function tryOpen() {
    attempts++;
    var ready = false;
    switch (link.type) {
      case 'task': ready = Array.isArray(window.tasks) && window.tasks.length > 0; break;
      case 'candidate': ready = !!document.getElementById('candidateDetailOverlay'); break;
      case 'lead': ready = !!document.getElementById('leadDetailOverlay'); break;
      case 'bug': ready = !!document.getElementById('bugDetailOverlay'); break;
    }
    if (!ready && attempts < maxAttempts) { setTimeout(tryOpen, 100); return; }
    if (!ready) { toast('Could not load entity — try refreshing', 'error'); _clearEntityHash(); return; }
    switch (link.type) {
      case 'task': openDetail(link.id); break;
      case 'candidate': openCandidateDetail(link.id); break;
      case 'lead': openLeadDetail(link.id); break;
      case 'bug': openBugDetail(link.id); break;
    }
  }
  setTimeout(tryOpen, 50);
}
```

- [ ] **Step 2: Hook into post-auth flow**

In `nbi-api.js`, find where `renderAll()` is called after successful auth (both login and session restore paths). After each `renderAll()` call, add:

```javascript
if (window._pendingDeepLink) {
  const link = window._pendingDeepLink;
  window._pendingDeepLink = null;
  _resolveDeepLink(link);
}
```

There are two call sites:
1. After login success (the `authFetch('/api/auth/me')` callback)
2. After session restore on page load

- [ ] **Step 3: Test by loading a deep-link URL directly**

Open: `http://localhost:8888/nbi_project_dashboard.html#task/e6951d0c-43b4-451a-a600-d9af97f86c18`

Expected: after login (or auto-session-restore), the Projects view loads, then the task detail panel opens for "M31/32 Telemetry Events List".

- [ ] **Step 4: Test invalid entity ID**

Open: `http://localhost:8888/nbi_project_dashboard.html#task/00000000-0000-0000-0000-000000000000`

Expected: view loads, detail panel does not open (task not found), URL reverts to `#tasks`. No crash.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/js/nbi-sidebar.js dashboard-server/public/js/nbi-api.js
git commit -m "feat(deep-link): resolve pending deep-links after auth completes"
```

---

### Task 7: Copy link button in detail panel headers

**Files:**
- Modify: `dashboard-server/public/js/views/nbi-detail.js` (task detail header)
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js` (candidate detail header)
- Modify: `dashboard-server/public/js/domains/nbi-leads.js` (lead detail header)
- Modify: `dashboard-server/public/js/domains/nbi-bugs.js` (bug detail header)
- Modify: `dashboard-server/public/js/nbi-events.js` (action handler)

A small button in each detail panel header that copies the full deep-link URL to the clipboard with a toast confirmation.

- [ ] **Step 1: Add the copy function to nbi-events.js**

RED-TEAM FIX: added fallback for insecure contexts where `navigator.clipboard` is unavailable.

```javascript
function copyEntityLink(prefix, id) {
  const url = window.location.origin + window.location.pathname + '#' + prefix + '/' + id;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(
      () => toast('Link copied'),
      () => _copyFallback(url)
    );
  } else {
    _copyFallback(url);
  }
}
function _copyFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Link copied'); }
  catch (e) { toast('Failed to copy link', 'error'); }
  document.body.removeChild(ta);
}
```

- [ ] **Step 2: Add copy button to task detail header**

In `nbi-detail.js`, find the detail panel header (line 95, the `detail-panel__header` div). Add a copy button next to the close button:

```javascript
`<button class="detail-panel__copy-link" data-action="copyEntityLink" data-arg0="task" data-arg1="${id}" title="Copy link">&#128279;</button>`
```

- [ ] **Step 3: Add copy button to candidate detail header**

In `nbi-hiring.js`, find the candidate detail header (around line 2410, where the close button is). Add before the close button:

```javascript
`<button class="btn btn--ghost btn--sm" data-action="copyEntityLink" data-arg0="hiring/candidate" data-arg1="${id}" title="Copy link" style="flex-shrink:0">&#128279;</button>`
```

- [ ] **Step 4: Add copy button to lead detail header**

In `nbi-leads.js`, find the lead detail header (around line 1415). Add before the close button:

```javascript
`<button class="btn btn--ghost" data-action="copyEntityLink" data-arg0="lead" data-arg1="${lead.id}" title="Copy link">&#128279;</button>`
```

- [ ] **Step 5: Add copy button to bug detail header**

In `nbi-bugs.js`, find the bug detail header (around line 664). Add before the close button:

```javascript
`<button class="btn btn--ghost btn--sm" data-action="copyEntityLink" data-arg0="bug" data-arg1="${id}" title="Copy link" style="flex-shrink:0">&#128279;</button>`
```

- [ ] **Step 6: Verify all four copy buttons work**

Open each entity type, click the copy link button, paste the URL in a new tab, verify it resolves to the same entity.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/js/nbi-events.js dashboard-server/public/js/views/nbi-detail.js dashboard-server/public/js/domains/nbi-hiring.js dashboard-server/public/js/domains/nbi-leads.js dashboard-server/public/js/domains/nbi-bugs.js
git commit -m "feat(deep-link): copy link button in all detail panel headers"
```

---

### Task 8: Bump cache-busters and final verification

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Bump cache-busters for all modified JS files**

Update version params in `nbi_project_dashboard.html` for: `nbi-sidebar.js`, `nbi-detail.js`, `nbi-hiring.js`, `nbi-leads.js`, `nbi-bugs.js`, `nbi-import.js`, `nbi-api.js`, `nbi-events.js`.

- [ ] **Step 2: Run full test suite**

Run: `npm run test:all`
Expected: All vitest + Playwright tests pass.

- [ ] **Step 3: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 4: End-to-end verification**

1. Open `#task/{known-uuid}` — should load Projects, open task detail
2. Open `#hiring/candidate/{known-uuid}` — should load Hiring, open candidate detail
3. Open `#lead/{known-uuid}` — should load Leads, open lead detail
4. Open `#bug/{known-uuid}` — should load Bugs, open bug detail
5. Open each entity, click copy link, paste in new tab — should resolve
6. Open a task detail, press Back — panel should close, URL reverts to `#tasks`
7. Open `#task/invalid-uuid` — should show error toast, revert to `#tasks`
8. RED-TEAM: Open `#task/{uuid}` while logged out — login, then panel should open after auth
9. RED-TEAM: Open task, press Back, press Forward — panel should reopen without errors
10. RED-TEAM: Open task A, click task B in tree (while A is open) — URL should update to B, Back should go to A

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(deep-link): bump cache-busters for deep-link changes"
```
