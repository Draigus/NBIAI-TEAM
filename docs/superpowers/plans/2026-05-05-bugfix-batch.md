# Bug Fix Batch — 4 Confirmed Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 verified bugs reported by the team without touching existing Lighthouse Games data or altering the database schema.

**Architecture:** All fixes are purely additive — CSS alignment changes, whitelist string additions, a re-render condition addition, and a column mapping addition. No migrations, no data mutations, no schema changes.

**Tech Stack:** Node.js (server.js), monolithic SPA (nbi_project_dashboard.html), Vitest for server tests.

**Constraint:** Lighthouse Games data is live. Zero tolerance for data corruption. All changes verified via tests before merge.

---

### Task 1: Fix timeline month labels — anchor to start of month instead of centre

**Bug ID:** `e3965bcd` — reported by Amir Didar

**Files:**
- Modify: `nbi_project_dashboard.html:1015` (CSS class `.gantt__month`)
- Modify: `nbi_project_dashboard.html:10639` (reporting view quarter header inline style)
- Modify: `nbi_project_dashboard.html:10643` (reporting view month header inline style)

- [ ] **Step 1: Change `.gantt__month` CSS from centre to left-aligned**

In `nbi_project_dashboard.html` line 1015, change:

```
.gantt__month { font-size: 0.68rem; font-weight: 600; color: var(--text-secondary); text-align: center; border-right: 1px solid var(--border-subtle); padding: 2px 0; }
```

to:

```
.gantt__month { font-size: 0.68rem; font-weight: 600; color: var(--text-secondary); text-align: left; padding-left: 4px; border-right: 1px solid var(--border-subtle); padding-top: 2px; padding-bottom: 2px; }
```

- [ ] **Step 2: Change reporting view quarter header inline style**

In `nbi_project_dashboard.html` line 10639, in the `quarters.forEach` callback, change `text-align:center` to `text-align:left;padding-left:4px`.

The full line currently reads:
```javascript
quarters.forEach(q => { const w = (q.days / totalDays * 100).toFixed(2); html += `<div style="width:${w}%;text-align:center;font-size:0.62rem;color:var(--text-muted);font-weight:700;letter-spacing:0.06em;padding:3px 0;border-right:1px solid var(--border-subtle)">${esc(q.label)}</div>`; });
```

Change `text-align:center;` to `text-align:left;padding-left:4px;`.

- [ ] **Step 3: Change reporting view month header inline style**

In `nbi_project_dashboard.html` line 10643, in the `months.forEach` callback, change `text-align:center` to `text-align:left;padding-left:4px`.

The full line currently reads:
```javascript
months.forEach(m => { const w = (m.days / totalDays * 100).toFixed(2); html += `<div style="width:${w}%;text-align:center;font-size:0.6rem;color:${m.isNow ? 'var(--accent-text)' : 'var(--text-muted)'};font-weight:${m.isNow ? '700' : '500'};padding:2px 0;border-right:1px solid var(--border-subtle)">${esc(m.label)}</div>`; });
```

Change `text-align:center;` to `text-align:left;padding-left:4px;`.

- [ ] **Step 4: Visual verification**

No unit test needed (CSS-only change). Verify by loading WorkSage and checking:
1. Gantt view (Projects tab → Gantt sub-view): month labels should sit at the left edge of each month column
2. Reporting view: quarter and month labels should sit at the left edge
3. The Gantt day-number headers (`.gantt__day-hdr`) should remain centre-aligned (they were not changed)

---

### Task 2: Fix page persistence on reload — add missing views to known list

**Bug ID:** `2223ac4b` — reported by Ruan

**Files:**
- Modify: `nbi_project_dashboard.html:4847` (hash restoration whitelist)

- [ ] **Step 1: Add missing view names to the known array**

In `nbi_project_dashboard.html` line 4847, change:

```javascript
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue'];
```

to:

```javascript
  const known = ['report','dashboard','tasks','people','leads','expenses','finances','news','bugs','settings','mytasks','queue','reporting','documentation','workload','hiring'];
```

- [ ] **Step 2: Verify by testing hash restoration**

No unit test needed (browser navigation logic). Verify by:
1. Navigate to Reporting view in WorkSage — URL should show `#reporting`
2. Press F5 (reload) — should stay on Reporting, not jump to Portfolio
3. Repeat for Documentation, Workload, and Hiring views
4. Verify existing views still work: navigate to Leads (`#leads`), reload, confirm it stays

---

### Task 3: Fix timeline bars not updating after hours edit

**Bug ID:** `f846925e` — reported by Magnus Pryer

**Files:**
- Modify: `nbi_project_dashboard.html:10039-10041` (structural change condition in `updateTask`)
- Modify: `nbi_project_dashboard.html:5706` (remove debug console.log)

- [ ] **Step 1: Add hours fields to the structural change condition**

In `nbi_project_dashboard.html` lines 10039-10041, change:

```javascript
  const structural = (field === 'status' && (
    value === 'Done' || value === 'Cancelled' || oldValue === 'Done' || oldValue === 'Cancelled'
  )) || field === 'client_id' || field === 'parent_id';
```

to:

```javascript
  const structural = (field === 'status' && (
    value === 'Done' || value === 'Cancelled' || oldValue === 'Done' || oldValue === 'Cancelled'
  )) || field === 'client_id' || field === 'parent_id'
    || field === 'hoursEstimated' || field === 'hoursSpent';
```

This triggers `renderContent()` when hours change, which redraws the timeline with the updated aggregation.

- [ ] **Step 2: Remove the [TL-DEBUG] console.log**

In `nbi_project_dashboard.html` line 5706, delete the entire line:

```javascript
    if (item.title && item.title.includes('Infrastructure')) console.log('[TL-DEBUG]', item.title, {descCount: globalDesc.length, leafCount: leafTasks.length, totalEst, totalSpent, pct, sampleHrs: globalDesc.slice(0,3).map(d => ({t:d.title,e:d.hoursEstimated,s:d.hoursSpent}))});
```

- [ ] **Step 3: Verify**

No unit test needed (UI re-render logic). Verify by:
1. Open WorkSage Portfolio view (timeline visible)
2. Double-click a feature that has child tasks with hours
3. Edit `hoursEstimated` or `hoursSpent` on a child task in the detail panel
4. Close the detail panel — the timeline bar width should now reflect the updated percentage
5. Open browser console — confirm no `[TL-DEBUG]` messages appear

---

### Task 4: Add hours_spent column to import wizard

**Bug ID:** `dee69d4e` — reported by Magnus Pryer

**Files:**
- Modify: `dashboard-server/server.js:2421` (add `iHoursSpent` column lookup in `mapRowsToTasks` hierarchy branch)
- Modify: `dashboard-server/server.js:2445` (add `hoursSpent` to output object)
- Modify: `nbi_project_dashboard.html:20563` (add `iHoursSpent` column lookup in frontend `confirmHierarchyImport`)
- Modify: `nbi_project_dashboard.html:20614` (add `hours_spent` to payload)
- Test: `dashboard-server/tests/unit/import-hierarchy.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `dashboard-server/tests/unit/import-hierarchy.test.mjs`, inside the `mapRowsToTasks (nbi-hierarchy-csv branch)` describe block, after the existing `captures practice_area, success_factor, collaborations, notes, hours_estimated` test:

```javascript
  it('captures hours_spent alongside hours_estimated', () => {
    const headersWithSpent = ['_temp_id', '_temp_parent_id', 'item_type', 'task', 'description',
      'status', 'priority', 'hours_estimated', 'hours_spent', 'assignees', 'client_id', 'practice_area',
      'start_date', 'end_date', 'due_date', 'success_factor', 'collaborations', 'notes'];
    const rows = [
      ['T1', '', 'task', 'My Task', '', 'Not started', '', '8', '3', 'Marie',
       'Lighthouse Games', 'gaming', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headersWithSpent, rows);
    expect(out[0].hoursEstimated).toBe(8);
    expect(out[0].hoursSpent).toBe(3);
  });

  it('defaults hoursSpent to 0 when column is absent', () => {
    const rows = [
      ['T1', '', 'task', 'My Task', '', 'Not started', '', '4', 'Marie',
       'Lighthouse Games', 'gaming', '', '', '', '', '', ''],
    ];
    const out = mapRowsToTasks('nbi-hierarchy-csv', headers, rows);
    expect(out[0].hoursEstimated).toBe(4);
    expect(out[0].hoursSpent).toBe(0);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/import-hierarchy.test.mjs -t "captures hours_spent"`

Expected: FAIL — `out[0].hoursSpent` is `undefined` because the mapper doesn't produce that field.

- [ ] **Step 3: Add hours_spent column lookup to server mapper**

In `dashboard-server/server.js`, after line 2421:

```javascript
      const iHoursEst = ciAny('hours_estimated', 'hours estimated', 'hours est');
```

Add:

```javascript
      const iHoursSpent = ciAny('hours_spent', 'hours spent');
```

Then in the return object (after line 2445 `hoursEstimated: parseFloat(get(r, iHoursEst)) || 0,`), add:

```javascript
          hoursSpent: parseFloat(get(r, iHoursSpent)) || 0,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd dashboard-server && npx vitest run tests/unit/import-hierarchy.test.mjs`

Expected: ALL tests PASS, including both new ones.

- [ ] **Step 5: Add hours_spent to frontend hierarchy import**

In `nbi_project_dashboard.html`, after line 20563:

```javascript
  const iHours = ci('hours_estimated') >= 0 ? ci('hours_estimated') : ci('hours estimated');
```

Add:

```javascript
  const iHoursSpent = ci('hours_spent') >= 0 ? ci('hours_spent') : ci('hours spent');
```

Then in the payload object (after line 20614 `hours_estimated: parseFloat(get(r, iHours)) || 0,`), add:

```javascript
      hours_spent: parseFloat(get(r, iHoursSpent)) || 0,
```

- [ ] **Step 6: Run the full test suite**

Run: `cd dashboard-server && npm test`

Expected: All tests pass. No regressions.

- [ ] **Step 7: Commit all changes**

```bash
git add nbi_project_dashboard.html dashboard-server/server.js dashboard-server/tests/unit/import-hierarchy.test.mjs
git commit -m "fix: month label alignment, page reload persistence, timeline hours refresh, import hours_spent

- Timeline month labels anchored to left edge instead of centred (bug e3965bcd)
- Added reporting/documentation/workload/hiring to page reload whitelist (bug 2223ac4b)
- Hours changes now trigger full re-render so timeline bars update (bug f846925e)
- Removed [TL-DEBUG] debug logging from timeline renderer
- Added hours_spent column mapping to hierarchy CSV import (bug dee69d4e)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Verification Checklist

After all tasks, verify end-to-end:

- [ ] `npm test` passes (all vitest tests green)
- [ ] `npm run test:all` passes (vitest + playwright)
- [ ] Load WorkSage in browser — Gantt month labels left-aligned
- [ ] Load WorkSage Reporting view — month/quarter labels left-aligned
- [ ] Navigate to Reporting view, reload page — stays on Reporting
- [ ] Navigate to Documentation view, reload page — stays on Documentation
- [ ] Edit hours on a task via detail panel — timeline bar updates without page reload
- [ ] No `[TL-DEBUG]` messages in browser console
- [ ] Import a CSV with `hours_spent` column — values appear on imported tasks
- [ ] Existing Lighthouse Games data unchanged (spot-check task counts and hours)
- [ ] Restart PM2: `pm2 restart nbi-dashboard`
- [ ] Update bug_reports status to `please_review` for all four bugs
- [ ] Add bug_report_comments for each bug with root cause, behavioural change, and test instructions
