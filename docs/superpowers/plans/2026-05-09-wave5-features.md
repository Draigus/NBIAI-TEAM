# Wave 5 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 remaining Wave 5 features: Not Started warnings, standup visual markers, SoW on leads, and hours/holidays. (Ctrl+Z undo already exists at line 21430, blocked tag context done in `32bdffb`.)

**Architecture:** Monolithic `dashboard-server/server.js` (~9600 lines) and `nbi_project_dashboard.html` (~21300 lines). PostgreSQL, Vitest for tests, PM2.

**Tech Stack:** Node.js/Express, PostgreSQL, vanilla JS SPA, Vitest

---

## Task 1: Not Started Warning — Cron + Notification (bug 2231e20b)

**Files:**
- Modify: `dashboard-server/server.js` — add to `buildDueWarningEmails()` at line ~10035
- Test: `dashboard-server/tests/unit/not-started-warning.test.mjs` (new)

**Behaviour:** Tasks with `start_date < today` and `status = 'Not started'` get flagged in the daily warning email alongside the existing overdue/due-soon sections. Also creates an in-app notification for the first assignee.

- [ ] **Step 1: Write failing test**

```javascript
// tests/unit/not-started-warning.test.mjs
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Test: task with start_date yesterday + status 'Not started' appears in warning email
// Test: task with start_date tomorrow + status 'Not started' does NOT appear
// Test: task with start_date yesterday + status 'In progress' does NOT appear
// Test: task with start_date yesterday + status 'Done' does NOT appear
```

- [ ] **Step 2: Add Not Started query to `buildDueWarningEmails`**

Inside `buildDueWarningEmails()`, after the existing overdue/due-soon/blocked queries (~line 9570), add:

```javascript
// 6. Not started but should have begun
const { rows: notStarted } = await pool.query(`
  SELECT id, title, start_date, assignees, priority
  FROM tasks WHERE start_date != '' AND start_date < $1
    AND status = 'Not started' AND client_id = ANY($2)
  ORDER BY start_date ASC
`, [today, clientIds]);
```

Then in the email HTML builder section (~line 9580+), add a new section:

```javascript
if (notStarted.length > 0) {
  sectionsHtml += buildEmailSection('Not Started (past start date)', '#f59e0b',
    buildEmailTable(['Task', 'Start Date', 'Assignee'], notStarted.map(t => [
      t.title, t.start_date, (t.assignees || []).join(', ') || 'Unassigned'
    ]))
  );
}
```

- [ ] **Step 3: Run tests**

```bash
cd dashboard-server && npx vitest run tests/unit/not-started-warning.test.mjs
```

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/server.js dashboard-server/tests/unit/not-started-warning.test.mjs
git commit -m "feat: Not Started warning in daily PM report emails"
```

---

## Task 2: Standup Overdue/Blocked Visual Markers (bug 58debdd7)

**Files:**
- Modify: `nbi_project_dashboard.html` — `renderStandupTaskRow()` at line 6211 and `standupDate()` at line 6334

**Behaviour:** In standup dropdown:
- Due dates that are overdue render in red text
- Tasks with status "Blocked" show a purple badge/tag
- Start dates that are past with status "Not started" show in amber

- [ ] **Step 1: Add overdue colouring to `standupDate`**

Replace `standupDate` at line 6334:

```javascript
function standupDate(taskId, field, currentVal, label, task) {
  let cls = 'standup-inline standup-inline--date';
  if (field === 'dueDate' && currentVal && task && task.status !== 'Done' && task.status !== 'Cancelled') {
    const d = safeParseDate(currentVal);
    if (d && d < new Date(new Date().toDateString())) cls += ' standup-inline--overdue';
  }
  if (field === 'startDate' && currentVal && task && task.status === 'Not started') {
    const d = safeParseDate(currentVal);
    if (d && d < new Date(new Date().toDateString())) cls += ' standup-inline--late-start';
  }
  return `<span class="standup-label">${label}</span><input type="date" class="${cls}" value="${currentVal||''}" onchange="event.stopPropagation();standupUpdateTask('${taskId}','${field}',this.value,this)" data-stop>`;
}
```

- [ ] **Step 2: Pass `task` to `standupDate` calls in `renderStandupTaskRow`**

At lines 6223-6225, change:
```javascript
html += standupDate(t.id, 'startDate', t.startDate, 'S', t);
html += standupDate(t.id, 'endDate', t.endDate, 'E', t);
html += standupDate(t.id, 'dueDate', t.dueDate, 'D', t);
```

- [ ] **Step 3: Add blocked badge after status select in `renderStandupTaskRow`**

After line 6218 (`standupSelect` for status), add:
```javascript
if (t.status === 'Blocked') {
  const info = t.blockerInfo || t.blocker_info;
  const reason = info ? (info.blockedOn || 'Blocked') : 'Blocked';
  html += `<span class="badge badge--blocked" style="font-size:0.6rem;padding:1px 6px" title="${esc(reason)}">BLOCKED</span>`;
}
```

- [ ] **Step 4: Add CSS for overdue/late-start date inputs**

```css
.standup-inline--overdue { color: var(--danger) !important; border-color: var(--danger) !important; }
.standup-inline--late-start { color: var(--warning) !important; border-color: var(--warning) !important; }
```

- [ ] **Step 5: Also update the second standup renderer**

Check for a duplicate standup rendering path (search for the second `standup-task__title` around line 6514) and apply the same blocked badge and date colouring there.

- [ ] **Step 6: Run `npm test` + commit**

```bash
cd dashboard-server && npm test
git add nbi_project_dashboard.html
git commit -m "feat: standup overdue dates in red, blocked badge in purple, late starts in amber"
```

---

## Task 3: SoW on Lead Card (bug 9b7d31c9)

**Files:**
- Create: `dashboard-server/migrations/NNN_leads_sow_id.sql` (new migration)
- Modify: `dashboard-server/server.js` — PATCH /api/leads allowed fields at line ~6984
- Modify: `dashboard-server/server.js` — GET /api/leads JOIN to include SoW title
- Modify: `nbi_project_dashboard.html` — lead detail panel at line ~16695

**Behaviour:** Leads can be linked to a SoW. Lead detail panel shows a SoW dropdown picker. Lead cards on the kanban show the SoW title if linked.

- [ ] **Step 1: Create migration**

Find the next migration number in `dashboard-server/migrations/` and create:

```sql
-- NNN_leads_sow_id.sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sow_id UUID REFERENCES sows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sow_id ON leads(sow_id);
```

- [ ] **Step 2: Run migration**

```bash
cd dashboard-server && npm run init-db
```

- [ ] **Step 3: Add `sow_id` to PATCH /api/leads allowed fields**

At line ~6984 in server.js, add `'sow_id'` to the `patchFields` array.

- [ ] **Step 4: Add SoW title JOIN to GET /api/leads**

Find the main leads SELECT query and LEFT JOIN sows to include `sow_title`:
```sql
LEFT JOIN sows sw ON sw.id = l.sow_id
```
Add `sw.title AS sow_title` to the SELECT columns.

- [ ] **Step 5: Add SoW picker to lead detail panel**

After the Practice field in the lead detail panel (~line 16680), add:
```javascript
// SoW
const clientSows = _allSowsCache ? _allSowsCache.filter(s => s.client_id === lead.client_id) : [];
html += `<label>Statement of Work</label><select onchange="updateLead('${lead.id}','sow_id',this.value||null)"><option value="">-- None --</option>`;
clientSows.forEach(s => {
  html += `<option value="${s.id}" ${lead.sow_id === s.id ? 'selected' : ''}>${esc(s.title)}</option>`;
});
html += `</select>`;
```

- [ ] **Step 6: Run `npm test` + commit**

```bash
cd dashboard-server && npm test
git add dashboard-server/migrations/ dashboard-server/server.js nbi_project_dashboard.html
git commit -m "feat: link SoW to lead cards via sow_id picker"
```

---

## Task 4: Hours Per Week / Holidays (bug 8ce48ae1)

**Files:**
- Create: `dashboard-server/migrations/NNN_user_time_off.sql` (new migration)
- Modify: `dashboard-server/server.js` — new endpoints for time-off CRUD, modify capacity calculation
- Modify: `nbi_project_dashboard.html` — workload view + settings panel for time-off

**Behaviour:** Each user has `capacity_hours_per_week` (already exists, default 40). New: a `time_off` table stores date ranges where a user is unavailable. The resource planning capacity calculation deducts time-off days from available hours.

- [ ] **Step 1: Create migration**

```sql
-- NNN_user_time_off.sql
CREATE TABLE IF NOT EXISTS time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_time_off_user ON time_off(user_id);
CREATE INDEX IF NOT EXISTS idx_time_off_dates ON time_off(start_date, end_date);
```

- [ ] **Step 2: Run migration**

```bash
cd dashboard-server && npm run init-db
```

- [ ] **Step 3: Add CRUD endpoints in server.js**

```javascript
// GET /api/users/:userId/time-off
// POST /api/users/:userId/time-off { start_date, end_date, label }
// DELETE /api/time-off/:id
```

- [ ] **Step 4: Modify capacity calculation**

In `GET /api/resource-planning/capacity` (~line 9263), after fetching user capacity, also fetch their time-off entries for the 8-week window. Deduct days off from available hours:

```javascript
const { rows: timeOff } = await pool.query(
  'SELECT user_id, start_date, end_date FROM time_off WHERE end_date >= $1 AND start_date <= $2',
  [windowStart, windowEnd]
);
```

For each user-week, count business days of time-off and subtract from `capacity_hours_per_week`.

- [ ] **Step 5: Add time-off UI to People/Workload view**

In the workload view, add a section showing each user's time-off entries with add/delete buttons.

- [ ] **Step 6: Run `npm test` + commit**

```bash
cd dashboard-server && npm test
git add dashboard-server/migrations/ dashboard-server/server.js nbi_project_dashboard.html
git commit -m "feat: time-off tracking deducted from capacity planning"
```

---

## Execution Notes

- Each task follows the CLAUDE.md Bug Triage Pipeline
- Run `npm test` after each task
- Update bug_reports status to `please_review` and add fix comment for each item
- Restart PM2 after server.js changes
- Tasks 1 and 2 are frontend/cron only (low risk). Tasks 3 and 4 involve DB migrations (medium risk).
