# Handoff -- Tech debt sprint (2026-04-19)

**Session:** Cleared all mechanical audit items. Discovered F-C2/F-B1/F-B2 already shipped. Planned tech debt reduction order with Glen.

**HEAD:** `b3d8c4e` on master.

---

## 1. What happened this session

Glen said "do the ones you can do on your own." Triaged all 14 remaining Bad-tier items:

- **3 already fixed** (verified in code): F-B21 (replaceState), F-B7 (clearInterval), B-B14 (graceful degradation)
- **3 fixed this session** (commit `b3d8c4e`): B-B12 (expense access check order), F-B11 (standup toggle DOM), B-B22 (fan-out resilience)
- **F-C2/F-B1/F-B2 already done**: Cookie migration is complete. Server sets HttpOnly cookie on login, frontend uses `credentials: 'include'`, zero localStorage token references. All 7 upload paths use cookies. Only remnant is a stale comment at `nbi_project_dashboard.html:2366`.
- **B-B17 closed by Glen**: Contracts kept forever, no cleanup.

**All 20 Critical items are now resolved.** (18 code fixes + B-C1 manual + F-C2 already done.)

### Glen's decisions

1. Contracts kept forever (B-B17 closed).
2. Tech debt before features. Work order agreed: F-B8 -> F-B17 -> F-B22 -> F-B16, then features.
3. B-B23 (shiftForInsert) and B-B24 (pagination) parked -- do when data volumes warrant it.

---

## 2. Work order -- tech debt reduction

Glen approved this order based on impact analysis. Do NOT skip items or reorder without asking.

### Step 1: F-B8 -- Board drag-drop through sync pipeline

**Why first:** Only item with real user-facing data-loss risk. Every board drag fires a raw PATCH that bypasses conflict detection. Multi-user editing can silently overwrite.

**Current code:** `onBoardDrop()` at `nbi_project_dashboard.html:7936-8011`
- Finds the task, computes new status + position
- Does optimistic local update: `task.status = newStatus; task.position = dropIdx`
- Fires `authFetch('/api/tasks/${taskId}', { method: 'PATCH', body: { status, position } })` directly
- On success, calls `load()` to re-fetch all tasks and converge positions

**The sync pipeline it should use:** `updateTask()` at `nbi_project_dashboard.html:8557-8640`
- Validates prerequisites, cascades, confirmations
- Sets field on local task object
- Calls `markDirty(id)` which queues for `syncToAPI()`
- `syncToAPI()` at line 2949 batches changes, sends via `POST /api/sync/changes` with `_serverUpdatedAt` for conflict detection
- Calls `save()` which writes to localStorage cache + debounces sync

**The fix:** Route `onBoardDrop` through `updateTask()` for the status change, and handle position via direct PATCH (position changes are server-authoritative via `reorderInGroup` and don't go through sync). Key considerations:
- `updateTask` has prerequisite checks for Done status -- `onBoardDrop` already has its own check at line 7963. Remove the duplicate or route through `updateTask`.
- `updateTask` triggers `openMarkAsBlockedPopup` on Blocked status -- board drop should also trigger this.
- Position changes still need the direct PATCH to `/api/tasks/:id` with `{ position }` because the sync pipeline doesn't handle position reordering.
- The `load()` call after PATCH is needed to converge shifted sibling positions.

**Effort:** Medium. Changes only `nbi_project_dashboard.html`. Worktree recommended (touches complex drag-drop flow in the 18k-line file).

**Test approach:** Manual board testing -- drag within lane (reorder), drag across lanes (status change), drag to Done with incomplete prerequisites (should block), drag to Blocked (should trigger popup). Also verify multi-user: open two browser tabs, drag in one, check the other converges.

---

### Step 2: F-B17 -- Merge renderAll/renderContent

**Why second:** Low risk, removes a drift source before bigger refactors.

**Current code:**
- `renderContent()` at `nbi_project_dashboard.html:4066-4098`: renders only the main content area. Saves/restores scroll. Handles view redirects. Dispatches to view-specific renderers. Logs slow renders.
- `renderAll()` at `nbi_project_dashboard.html:4106-4138`: calls `renderSidebar()`, `renderTabs()`, `renderBreadcrumbs()`, then does the same view dispatch as `renderContent()`. Also handles view redirects and empty state. Does NOT save/restore scroll.

**Differences:**
- `renderAll` additionally calls: `renderSidebar()`, `renderTabs()`, `renderBreadcrumbs()`
- `renderAll` does NOT save/restore scrollTop (renderContent does)
- Both have identical view redirect logic (incomplete -> tasks, changelog -> settings)
- Both have identical empty-state check (tasks.length === 0)
- Both have identical view dispatcher (if/else chain)
- Both have identical gantt arrow draw
- Both have performance logging (renderAll and renderContent)

**The fix:** Extract the shared view-dispatch + empty-state + redirect logic into a private `_renderMainContent(content)` helper. `renderAll` calls sidebar/tabs/breadcrumbs then `_renderMainContent`. `renderContent` saves scroll, calls `_renderMainContent`, restores scroll.

**Effort:** Small. One file, mechanical extraction.

**Test approach:** `npm test` (vitest). Manual: switch views, check sidebar updates, check scroll preservation on filter changes.

---

### Step 3: F-B22 -- Migrate ~211 inline onclick to event delegation

**Why third:** Highest compounding effect. Every new feature currently adds more inline handlers. Blocks strict CSP (B-N14). Reduces HTML size. Reduces XSS attack surface.

**Current code:** ~211 `onclick="..."` attributes scattered across `nbi_project_dashboard.html`. Examples:
- `onclick="switchView('tasks')"` in sidebar
- `onclick="filterByClient('${escAttrJs(c)}')"` in sidebar filters
- `onclick="toggleStandupDone('${escAttrJs(person)}', this)"` in standup
- `onclick="openDetailOverlay('${t.id}')"` on task titles
- `onclick="updateTask('${t.id}','status','Done')"` on inline controls

**The fix:** Centralised event delegation pattern:
1. Replace `onclick="fn(args)"` with `data-action="fn" data-arg1="value"` attributes
2. Single document-level click handler reads `data-action` and dispatches to the named function
3. Arguments passed via `data-*` attributes, parsed by the dispatcher
4. For complex argument patterns (multi-arg, objects), use `data-args='["a","b"]'` with JSON parse

**Effort:** Large. Mechanical but tedious. Should be done in batches per view (sidebar first, then tasks, then board, then each remaining view) with tests between batches. Worktree mandatory.

**Test approach:** Every view must be manually exercised after migration. Click every button, toggle, filter. Vitest for server. Playwright for key flows if available.

---

### Step 4: F-B16 -- Consolidate window globals into state object

**Why fourth:** Easier after F-B22 because event delegation naturally pushes toward centralised state.

**Current code:** View state scattered across ~30+ module-level variables:
- `nbi_project_dashboard.html:2787-2814`: `currentFilter`, `selectedTaskIds`, `taskSubView`, `_peopleFilter`, `_peopleSubView`, `_peopleCalView`, `_reportSubView`, `_financeData`, etc.
- Some persisted in localStorage: `taskSubView` (line 2790), `_peopleCalView` (line 2799)
- Some are derived state that could be computed

**The fix:** Consolidate into a single `_viewState` object. Views read from `_viewState.tasks.subView` instead of `taskSubView`. localStorage persistence moves to a single `save/load viewState` pair.

**Effort:** Large. Touches nearly every view renderer. Should be done incrementally (one view's state at a time). Worktree mandatory.

---

## 3. Remaining audit items (parked)

| Ref | Item | Status |
|---|---|---|
| B-B23 | shiftForInsert O(N) | Parked -- do when data volumes warrant |
| B-B24 | Aggregate pagination | Parked -- do when tables grow large |
| B-N2 | 8,300-line server.js | Needs Review -- architectural |
| F-N8 | 18,500-line HTML file | Needs Review -- root cause of frontend debt |
| B-N14 | CSP allows unsafe-inline | Unblocked after F-B22 ships |
| 44 others | Needs Review tier | Architectural judgement calls |

---

## 4. Feature backlog (after tech debt)

| Item | Effort | Notes |
|---|---|---|
| G5 client-scoped users | Large | Biggest feature. Needs spec + brainstorming. |
| News aggregator M3 frontend | Medium | 10 tasks in plan |
| HC Page and Board (Z7) | Medium | Needs brainstorming |
| Hiring Page rewrite | Medium | Needs brainstorming |
| Gantt dependency arrows (O6) | Medium | Needs brainstorming |
| SoW layer in hierarchy (Z6) | Medium | Needs brainstorming |
| Telemetry + BI dashboard | Medium | Plan exists |
| Finance P&L enhancement | Medium | Glen wants detailed true P&L |

---

## 5. Blocked on external input

| Blocker | What it blocks |
|---|---|
| SMTP provider config | Email features, PM reports, password reset, warning system |
| `ANTHROPIC_API_KEY` in news `.env` | Live LLM news pipeline (M2 code ready) |
| Glen's credential rotation (B-C1) | Secrets in OneDrive |

---

## 6. Environment / running state

```
PM2:
  nbi-dashboard  (cluster, 1 instance)  port 8888   pid 42504  online
  nbi-news       (fork)                 127.0.0.1:8890  pid 18268  online
  cloudflared    tunnel run

Working tree:
  repo:    D:/OneDrive/Claude_code/NBIAI_TEAM
  branch:  master
  HEAD:    b3d8c4e

Tests: 128 vitest, all green.

Settings (all three levels):
  C:\Users\gpbea\.claude\settings.json         -- model: claude-opus-4-6, defaultMode: dontAsk
  C:\Users\gpbea\.claude\settings.local.json   -- defaultMode: dontAsk
  .claude/settings.local.json                  -- model: claude-opus-4-6, defaultMode: dontAsk
```

---

## 7. Key rules from memory

- British English, no em-dashes, no emojis
- Verify in browser against worksage.nbi-consulting.com, not curl
- No fabricated analysis -- never relay sub-agent numbers as measurements
- No scope-watering -- never narrow scope to reduce effort
- No timelines -- structure by milestone deliverables
- Glen reviews finished products only -- no phase gates
- Worktree first for changes touching >3 files in dashboard-server/ or nbi_project_dashboard.html
- Auto-handoff at ~75% context
- Do not touch `_archive/nbiai_app/`
- Tech debt before features (Glen directive this session)

---

## 8. Start-up prompt

> Read `projects/nbi_dashboard/session_handoffs/handoff_2026-04-19_tech_debt_sprint.md` in full before doing anything. You are continuing WorkSage development. HEAD is `3622880` on master.
>
> **FIRST THING:** Verify permission settings so you don't get blocked by approval prompts. Read these three files and confirm each has `"defaultMode": "dontAsk"` inside the `permissions` block:
> 1. `C:\Users\gpbea\.claude\settings.local.json`
> 2. `C:\Users\gpbea\.claude\settings.json`
> 3. `.claude/settings.local.json` (project-level)
>
> If any is missing `defaultMode: dontAsk`, add it before doing anything else. Report the result to Glen.
>
> **WORK ORDER (Glen-approved, do not skip or reorder):**
> 1. F-B8: Route board drag-drop through sync pipeline (fix data-loss risk)
> 2. F-B17: Merge renderAll/renderContent (remove drift source)
> 3. F-B22: Migrate ~211 inline onclick to event delegation (highest compounding debt)
> 4. F-B16: Consolidate window globals into state object
>
> **Start with F-B8.** The handoff has full code locations, the current implementation, and what needs to change. Use a worktree -- this touches the drag-drop flow in the 18,500-line HTML file. Plan the fix, write it, test manually on the board (drag within lane, across lanes, to Done with incomplete prereqs, to Blocked). Run `npm test` from `dashboard-server/`. Restart PM2 after.
>
> After F-B8, move to F-B17 (small, mechanical). Then F-B22 (large, do in batches per view with worktree). Then F-B16.
>
> 128 vitest tests, all green. PM2 running. Do not touch `_archive/nbiai_app/`.

---

End of handoff.
