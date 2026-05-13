# Hours Per Week — Per-User Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins set per-user weekly capacity (hours/week) in Settings, and use those values in all People view workload calculations instead of the hardcoded 40.

**Architecture:** Add `capacity_hours_per_week` to the server's user PATCH allowedFields so the existing `updateUserField` function works. Add a column to the Settings user table. Replace the hardcoded `WEEKLY_CAPACITY = 40` with a per-user lookup from `_cachedUsers`. Fix the days-off deduction to use `capacity / 5` instead of hardcoded `8`.

**Tech Stack:** Monolithic SPA (`nbi_project_dashboard.html`), Express server (`dashboard-server/server.js`)

---

### Task 1: Allow capacity_hours_per_week via the main user PATCH endpoint

**Files:**
- Modify: `dashboard-server/server.js:1334`

Currently `PATCH /api/users/:id` has an `allowedFields` array at line 1334 that does not include `capacity_hours_per_week`. The field IS in the users table and IS accepted by `PATCH /api/users/:id/skills` (line 9290), but the user management UI calls `updateUserField` which hits the main PATCH endpoint.

- [ ] **Step 1: Add capacity_hours_per_week to allowedFields**

In `dashboard-server/server.js` line 1333-1334, change:

```javascript
  const allowedFields = isAdmin
    ? ['role', 'display_name', 'email', 'client_id', 'is_active', 'client_role', 'docs_view', 'docs_edit', 'docs_create', 'docs_upload', 'can_submit_queue']
```

to:

```javascript
  const allowedFields = isAdmin
    ? ['role', 'display_name', 'email', 'client_id', 'is_active', 'client_role', 'docs_view', 'docs_edit', 'docs_create', 'docs_upload', 'can_submit_queue', 'capacity_hours_per_week']
```

- [ ] **Step 2: Verify tests still pass**

Run: `cd dashboard-server && npm test`
Expected: All tests pass. No test touches capacity field yet.

---

### Task 2: Add Hours/wk column to Settings user management table

**Files:**
- Modify: `nbi_project_dashboard.html:21227` (table header)
- Modify: `nbi_project_dashboard.html:21230-21237` (user row rendering)
- Modify: `nbi_project_dashboard.html:21319` (updateUserField toast labels)

- [ ] **Step 1: Add table header column**

In `nbi_project_dashboard.html` line 21227, the table header currently reads:

```javascript
el.innerHTML = `<table class="report-table" style="font-size:0.8rem"><thead><tr><th>Username</th><th>Display Name</th><th>Email</th><th>Role</th><th>Client Scope</th><th>Docs / Queue</th><th></th></tr></thead><tbody>` +
```

Change to:

```javascript
el.innerHTML = `<table class="report-table" style="font-size:0.8rem"><thead><tr><th>Username</th><th>Display Name</th><th>Email</th><th>Role</th><th>Hrs/wk</th><th>Client Scope</th><th>Docs / Queue</th><th></th></tr></thead><tbody>` +
```

- [ ] **Step 2: Add Hours/wk input column to each user row**

In `nbi_project_dashboard.html`, inside the user row template (lines 21230-21238), after the Role `<td>` (line 21234) and before the Client Scope `<td>` (line 21235), add a new table cell:

After the line containing `<option value="admin"`:
```javascript
        <td><input type="number" min="1" max="80" step="1" value="${u.capacity_hours_per_week || 40}" onchange="updateUserCapacity('${u.id}',this.value)" style="width:50px;padding:2px 4px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:3px;color:var(--text-primary);font-size:0.8rem;text-align:center"></td>
```

- [ ] **Step 3: Add the updateUserCapacity function**

After the `updateUserField` function (after line 21323), add:

```javascript
async function updateUserCapacity(userId, value) {
  const hrs = parseInt(value, 10);
  if (isNaN(hrs) || hrs < 1 || hrs > 80) { toast('Hours must be between 1 and 80', 'error'); return; }
  try {
    const resp = await authFetch('/api/users/' + userId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacity_hours_per_week: hrs })
    });
    if (resp.ok) {
      const cached = _cachedUsers.find(u => u.id === userId);
      if (cached) cached.capacity_hours_per_week = hrs;
      toast('Capacity updated to ' + hrs + 'h/wk');
    } else toast('Update failed', 'error');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}
```

Note: this also updates `_cachedUsers` in-memory so the People view reflects the change without reloading.

---

### Task 3: Replace hardcoded WEEKLY_CAPACITY with per-user capacity in workload view

**Files:**
- Modify: `nbi_project_dashboard.html:11375` (remove hardcoded constant)
- Modify: `nbi_project_dashboard.html:11390-11404` (weekUtilFor function)
- Modify: `nbi_project_dashboard.html:11419` (workloadRows util calculation)

- [ ] **Step 1: Add a capacity lookup helper and remove the constant**

In `nbi_project_dashboard.html` line 11375, replace:

```javascript
  const WEEKLY_CAPACITY = 40;
```

with:

```javascript
  function getCapacity(personName) {
    if (!Array.isArray(_cachedUsers)) return 40;
    const u = _cachedUsers.find(x => x.display_name === personName);
    return (u && u.capacity_hours_per_week) || 40;
  }
```

- [ ] **Step 2: Update weekUtilFor to use per-user capacity**

In `nbi_project_dashboard.html` lines 11390-11404, change the `weekUtilFor` function:

Current:
```javascript
  function weekUtilFor(person, weekStart, weekEnd) {
    const weekTasks = filtered.filter(t => {
      if (!isAssignedTo(t, person)) return false;
      if (t.status === 'Done' || t.status === 'Cancelled') return false;
      const start = t.startDate ? safeParseDate(t.startDate) : null;
      const end = t.endDate ? safeParseDate(t.endDate) : (t.dueDate ? safeParseDate(t.dueDate) : null);
      if (!end) return false;
      return (!start || start <= weekEnd) && end >= weekStart;
    });
    const committed = weekTasks.reduce((s, t) => s + (t.hoursEstimated || 0), 0);
    const daysOff = (typeof computeDaysOff === 'function') ? computeDaysOff(person, weekStart, weekEnd, _capacityEvents) : 0;
    const effCap = Math.max(0, WEEKLY_CAPACITY - daysOff * 8);
    if (effCap === 0) return { pct: null, label: 'OFF', daysOff };
    return { pct: Math.round(committed / effCap * 100), daysOff };
  }
```

Change to:
```javascript
  function weekUtilFor(person, weekStart, weekEnd) {
    const cap = getCapacity(person);
    const weekTasks = filtered.filter(t => {
      if (!isAssignedTo(t, person)) return false;
      if (t.status === 'Done' || t.status === 'Cancelled') return false;
      const start = t.startDate ? safeParseDate(t.startDate) : null;
      const end = t.endDate ? safeParseDate(t.endDate) : (t.dueDate ? safeParseDate(t.dueDate) : null);
      if (!end) return false;
      return (!start || start <= weekEnd) && end >= weekStart;
    });
    const committed = weekTasks.reduce((s, t) => s + (t.hoursEstimated || 0), 0);
    const daysOff = (typeof computeDaysOff === 'function') ? computeDaysOff(person, weekStart, weekEnd, _capacityEvents) : 0;
    const effCap = Math.max(0, cap - daysOff * (cap / 5));
    if (effCap === 0) return { pct: null, label: 'OFF', daysOff };
    return { pct: Math.round(committed / effCap * 100), daysOff };
  }
```

Key changes: `cap = getCapacity(person)` replaces `WEEKLY_CAPACITY`, and `daysOff * (cap / 5)` replaces `daysOff * 8`.

- [ ] **Step 3: Update workloadRows util calculation**

In `nbi_project_dashboard.html` line 11419, change:

```javascript
      util: Math.round((activeTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0)) / WEEKLY_CAPACITY * 100),
```

to:

```javascript
      util: Math.round((activeTasks.reduce((s,t) => s + (t.hoursEstimated||0), 0)) / getCapacity(p) * 100),
```

---

### Task 4: Commit and deploy

- [ ] **Step 1: Run the full test suite**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html dashboard-server/server.js
git commit -m "feat: per-user hours/week capacity setting with workload integration

- Added Hours/wk column to Settings > Team user management table
- Capacity saved via PATCH /api/users/:id (added to allowedFields)
- People workload view now uses per-user capacity instead of hardcoded 40h
- Days-off deduction proportional to user capacity (30h/wk person loses 6h/day, not 8h)
- Capacity heatmap already uses per-user values server-side (no change needed)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 3: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 4: Update bug report**

Set bug `8ce48ae1` status to `please_review`, add comment explaining the change.

---

## Verification Checklist

- [ ] `npm test` passes (all tests green)
- [ ] Settings > Team shows "Hrs/wk" column with inputs defaulting to 40
- [ ] Changing a user's Hrs/wk to 30 saves successfully (toast confirms)
- [ ] People workload view reflects the changed capacity (utilisation % changes)
- [ ] A user with 30h/wk and 1 day off shows 24h effective capacity, not 32h
- [ ] Users without a set capacity default to 40h
- [ ] Capacity heatmap shows correct per-user capacity (unchanged, already server-side)
- [ ] Existing Lighthouse Games data unchanged
