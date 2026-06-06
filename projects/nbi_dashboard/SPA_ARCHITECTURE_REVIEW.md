# WorkSage SPA Architecture Review

**File:** `nbi_project_dashboard.html` (30,581 lines)  
**Date:** 2026-06-06  
**Scope:** Full codebase review across 6 parallel agents covering CSS, core infrastructure, UI framework, task system, reporting/finance, leads/hiring, command centre, settings, and import/export.

---

## Executive Summary

The SPA is a functional, feature-rich application that has grown organically to 30,581 lines with ~1,166 functions. The review identified **17 critical/blocker issues** and **~55 warnings** across security, data integrity, state management, and code quality.

The three most urgent categories:

1. **XSS vulnerabilities (8 instances)** -- multiple locations inject server or user data into innerHTML without escaping, despite an `esc()` function being available throughout
2. **Data loss risks (5 instances)** -- sync race conditions, WAL recovery gaps, premature dirty-flag clearing, and destructive imports without confirmation
3. **Logic bugs causing silent failures (4 instances)** -- infinite re-render loops, broken pagination, wrong formulas, always-true cache guards

---

## CRITICAL / BLOCKER Findings

### XSS & Injection (8 findings)

| ID | Lines | Description |
|---|---|---|
| XSS-1 | 3567-3572 | **Global error handler injects raw `msg` into innerHTML.** The `window.onerror` handler concatenates error messages directly without escaping. Since error messages can contain user-controlled data (e.g. a task title that causes a JS error), this fires before auth and is exploitable. Fix: use `textContent` or DOM API. |
| XSS-2 | 21880-21881 | **Mammoth .docx preview injects raw HTML.** `mammoth.convertToHtml()` output is set via `innerHTML` without sanitisation. A crafted .docx uploaded as a job description executes arbitrary JS when previewed. Fix: sanitise with DOMPurify. |
| XSS-3 | 30563, 30570 | **News search `snippet` fields rendered without escaping.** Headlines use `newsEsc()` but snippets are raw. Attacker-influenced article content (via RSS ingestion) executes on search. |
| XSS-4 | 24784 | **Intelligence brief section items rendered without escaping.** Items from `/api/intelligence/brief` go directly into `<li>` tags. Compromised pipeline data executes in browser. |
| XSS-5 | 24815 | **Intelligence research finding titles unescaped.** `f.title` from `/api/intelligence/research` rendered raw into innerHTML. |
| XSS-6 | 24835 | **Intelligence pending actions unescaped.** Pipeline pending items rendered without `esc()`. |
| XSS-7 | 4007 | **Assignee dropdown uses string interpolation in `onchange` handler.** `taskId` interpolated into JS context where HTML-escaping (`esc()`) cannot protect. Should use `data-action` delegation. |
| INJ-1 | 3641-3657 | **Open function dispatch via `data-action` exposes all `window` functions.** Any HTML injection elsewhere becomes privilege escalation -- attacker can invoke `executeDataCleanse`, `handleLogout`, etc. Fix: use an allowlist of permitted actions. |

### Data Loss & Integrity (5 findings)

| ID | Lines | Description |
|---|---|---|
| DATA-1 | 4452-4545 | **Sync race condition loses edits.** `_dirtyTaskIds.clear()` runs before the HTTP response. Edits made between clear and response completion lose their dirty flag and never sync. |
| DATA-2 | 4668-4679 | **WAL recovery silently drops new tasks.** If a user creates a task and the browser crashes before sync, the WAL has it but recovery skips "orphan" entries instead of creating them. |
| DATA-3 | 27874-27878 | **Legacy CSV import destructively replaces ALL tasks without confirmation.** `_confirmLegacyImport` marks every existing task as deleted with no undo. Unlike the Downloads import path, no confirmation dialog is shown. |
| DATA-4 | 14517-14536 | **Docs title edit hijacks body autosave timer.** Editing a document title clears `_docsAutosaveTimer`, cancelling any pending body content save. Dirty body content is silently lost until the next editor keystroke. |
| DATA-5 | 15845-15846 | **Finance entries zeroed on practice filter.** When a practice filter is active, `_financeEntries` (a module-level array) is reassigned to `[]`. Switching back to "all practices" shows nothing until page reload. |

### Logic Bugs Causing Silent Failures (4 findings)

| ID | Lines | Description |
|---|---|---|
| LOOP-1 | 6142-6146 | **Infinite re-render loop on network failure.** If `loadDashboardSnapshots` fails, `_portfolioSnapshots` stays null, causing `renderContent()` to re-trigger the fetch endlessly, freezing the browser tab. Same risk for `_portfolioLeadCount` and `_leadsConfig`. |
| PAGE-1 | 16663-16686 | **Changelog "Load More" re-fetches page 0 forever.** `_changelogOffset` is never incremented after fetch. Every "Load More" click appends duplicates of the first 50 entries. |
| CALC-1 | 16090 | **Cash runway formula is wrong.** Calculated as `netProfit / monthlyBurn` instead of `cashReserves / monthlyBurn`. For a profitable company, this shows a meaningless ratio labelled as "months of runway". |
| CACHE-1 | 8241 | **Capacity events never re-fetch.** Guard `_capacityEvents.length >= 0` is always true (array length is never negative). Capacity data loads once and never refreshes. |

### Other Blockers (5 findings)

| ID | Lines | Description |
|---|---|---|
| BUG-1 | 11237 | **`showToast` does not exist in year validation.** Calls `showToast()` but the function is named `toast()`. ReferenceError makes the validation unreachable -- invalid dates silently accepted. Same issue at lines 21694, 21724, 21750. |
| BUG-2 | 9991-10000 | **Duplicate Due Date fields.** Auto-calculated (disabled) and editable date fields render simultaneously for features/stories with children, confusing users. |
| BUG-3 | 10955 | **`uploadAttachment` uses bare `fetch()`.** Bypasses `authFetch()` -- no 401 redirect, no 403 handling on expired sessions. Same issue at lines 15673, 17625. |
| BUG-4 | 9732-9733 | **Gantt drag uses `offset * 86400000` for date math.** Off-by-one on DST transitions (23h or 25h days). |
| BUG-5 | 10277-10285 | **`getDepth` has no cycle protection.** Infinite loop on corrupted parent chains, unlike `getRootAncestor` which has a `visited` guard. |

---

## HIGH Severity Findings

### Security

| ID | Lines | Description |
|---|---|---|
| SEC-1 | 15315 | **Hardcoded email recipient and bank details in expense export.** `trieger@nbi-consulting.com` hardcoded in client JS. Email body hardcodes "Redacted bank statements (Monzo Jan-Mar 2026)" regardless of actual content. |
| SEC-2 | 14607 | **Full salary/financial data stored in localStorage unencrypted.** Individual employee names and salaries serialised as plain JSON. Any XSS or browser extension can read this. |
| SEC-3 | 29577-29583 | **Init error path bypasses authentication.** If `/api/auth/me` throws (network error), the app shows cached data from IndexedDB with no auth check. Allows viewing sensitive data without login. |
| SEC-4 | 22199-22222 | **Candidate PII visible to all authenticated users.** Email, LinkedIn, salary data rendered for non-admin NBI members with no field-level access control. GDPR concern for UK hiring data. |

### Data Integrity

| ID | Lines | Description |
|---|---|---|
| INT-1 | 15048-15055 | **Expense grand total mixes currencies.** GBP, USD, EUR amounts summed into one total displayed as pounds. `totals_by_currency` from API is fetched but never used. |
| INT-2 | 4704-4728 | **`beforeunload` sync silently fails on large payloads.** `keepalive` requests limited to 64KB. Many dirty tasks with large notes exceed this, and the request is silently dropped. |
| INT-3 | 16221 | **Hardcoded year 2026 in expense actuals filter.** `d.getFullYear() !== 2026` will filter out all data in 2027+. |
| INT-4 | 10107 | **Note delete by array index.** Sync polling can shift indices between render and delete action, deleting the wrong note. |
| INT-5 | 10408 | **Reparent sets `task.client = ''` instead of inheriting from new parent.** Drag-drop reparenting orphans the task from its client. |

---

## MEDIUM Severity Findings

### Bugs

| ID | Lines | Description |
|---|---|---|
| MED-1 | 5076-5092 | **`themedConfirm` race condition.** Single global `_confirmResolve` -- opening a second dialog while first is pending causes the first promise to never resolve, hanging any `await`ing code. |
| MED-2 | 8689 | **Calendar expand duplicates chips.** `calExpandDay` checks `[onclick*="${t.id}"]` but chips use `data-arg0` -- selector never matches, duplicates rendered. |
| MED-3 | 8087 | **Board "view in tree" sets `currentFilter.status` to string, not array.** Breaks multi-select filter. |
| MED-4 | 11654 | **Blocked undo restores all items to "In progress"** regardless of their original status before being blocked. |
| MED-5 | 12188-12191 | **Progress bar can exceed 100%.** Independent rounding of percentages -- e.g. 3 items split 3/2/2 rounds to 43+29+29=101%. |
| MED-6 | 12850-12871 | **`normaliseAssignees` prefix matching too aggressive.** "Tom" merges with "Tommy", "Al" with "Alice" due to bidirectional prefix check. |
| MED-7 | 14434-14435 | **Docs conflict sets `dirty = false` before user decides.** If user chooses "overwrite" and it fails, dirty flag already cleared -- user thinks content saved. |
| MED-8 | 16832-16833 | **`fmtMoney` ternary has identical branches.** `.toFixed(n % 1000 === 0 ? 0 : 0)` -- second `0` should be `1` for sub-1000 precision (e.g. `25.5k` vs `26k`). |
| MED-9 | 3613-3637 | **Date paste produces invalid dates.** DD/MM assumed but month>12 not validated. `2026-14-03` persisted to database. |
| MED-10 | 27074-27077 | **`toggleAllContractTasks` receives string `"false"` (truthy).** Deselect All sets `selected = "false"` which is truthy -- tasks remain selected on import. |
| MED-11 | 25874-25879 | **Chat WebSocket race condition.** Message sent via 100ms setTimeout after connect -- silently dropped if handshake takes longer. No retry or queue. |

### Architecture

| ID | Lines | Description |
|---|---|---|
| ARCH-1 | 19754-23447 | **Hiring section is ~6,800 lines with no modular boundaries.** Candidate pipeline, positions, interviews, scorecards, onboarding, GDPR, rejections -- all in one continuous block with shared mutable globals and dozens of `window._` handlers. |
| ARCH-2 | 15805-16209 | **`renderFinancesView` is 400+ lines** mixing P&L calculations, HTML generation, and state management. P&L logic duplicated verbatim in `exportPnLCSV`. |
| ARCH-3 | 17032-17100, 19256-19344, 20097-20174 | **Kanban drag-drop implemented 3 times** (leads, bugs, hiring). ~150 lines of identical "find nearest card" logic that could be a shared utility. |
| ARCH-4 | 6142-6161 | **Dashboard fires 4 independent async loads, each triggering `renderContent()`.** No batching -- dashboard re-renders up to 4 times on load. |
| ARCH-5 | 4348-4398 | **50+ mutable `let` variables at module scope.** No encapsulation, no state machine. Any function can mutate any variable. |

---

## LOW Severity / Code Quality (selected highlights)

| ID | Lines | Description |
|---|---|---|
| LOW-1 | 6191-6226 | **6 dead variables in `renderTacticalDashboard`.** `imminentTasks`, `dueThisWeek`, `inProgress`, `done`, `completedThisWeek`, `newlyOverdue` computed on every render but never used. Remnants of removed KPI strip. |
| LOW-2 | 3661-3804 | **~90 `_act*` wrapper functions** that are one-line state setters + `renderContent()`. Could be a dispatch table. |
| LOW-3 | 14493/14561 | **Duplicate function `_actDocsOpenForClient`** defined twice with identical bodies. |
| LOW-4 | 18157/18574 | **Duplicate function `deleteLead`** -- second definition silently overwrites first. Active version does not check `resp.ok` before closing detail panel. |
| LOW-5 | 12894 | **Hardcoded `CLIENT_STAFF` exclusion list.** Names like "Robin", "Lorenza", "Jeff Day" hardcoded -- requires code change when staff change. Should be driven by user metadata. |
| LOW-6 | 29592/29755 | **Duplicate keyboard accessibility handlers.** Two `keydown` listeners both call `el.click()`, causing double-execution of onclick handlers. |
| LOW-7 | 23836 | **`_ccValidTabs` missing 'intel'.** Intel tab works but selection isn't persisted -- defaults to 'work' on reload. |
| LOW-8 | 7060 vs 6184 | **"This week" calculated two different ways.** Tactical dashboard uses "next 7 days"; standup metrics uses "until next Sunday". |
| LOW-9 | 30226-30228 | **`newsEsc` duplicates global `esc` function.** Identical implementation, unnecessary duplication. |
| LOW-10 | 10318-10329 | **`bulkDelete` orphans descendant tasks.** No child cleanup or dependency reference cleanup on bulk delete. |
| LOW-11 | 25764-25769 | **Meetings person filter not applied.** `_mtgFilters._personMeetingIds` is set but `_mtgApplyFilters` never checks it -- clicking "X meetings" on a person card shows all meetings unfiltered. |
| LOW-12 | 10843 | **Prerequisite dropdown capped at 80 items with no search.** Tasks past position 80 are inaccessible as prerequisites. |

---

## Systemic Patterns

### 1. Inconsistent escaping discipline
The codebase has a working `esc()` function used in many places, but at least 8 locations skip it. The pattern: older code and infrastructure code (error handler, intelligence, news) tends to skip escaping; newer feature code (tasks, leads) generally uses it. A systematic audit-and-fix pass would close all XSS vectors.

### 2. `fetch()` vs `authFetch()` inconsistency
At least 4 locations use bare `fetch()` with `credentials: 'include'` instead of `authFetch()`. This bypasses 401 redirect logic, token refresh, and any CSRF protections. Locations: attachment upload (10955), receipt upload (15673), SoW upload (17625), and the error handler path.

### 3. `toast()` vs `showToast()` naming confusion
Both names appear throughout the codebase. If they are not aliases, several code paths throw ReferenceError on the error path (meaning errors in error handling -- the worst kind of bug). Locations: 11237, 21694, 21724, 21750, 26267, 26854, 26960.

### 4. Optimistic state updates without rollback
Multiple features clear dirty flags or update local state before confirming server success: sync (`_dirtyTaskIds.clear`), docs (`_docsState.dirty`), finance entries, meeting edits. On failure, some attempt re-fetch but none roll back to pre-mutation state.

### 5. Async-load-then-rerender cascade
The pattern of `loadX().then(() => renderContent())` called during a render cycle appears throughout the dashboard, client profile, milestones, and people views. This causes multiple full re-renders per navigation and creates infinite loop risk when the async load fails without setting a sentinel.

### 6. No module boundaries
The 30,581-line file has logical sections marked by comments but no actual encapsulation. All 50+ state variables, all 1,166 functions, and all event handlers share a single global scope. Function name collisions (2 instances of duplicate definitions found) are silent. Variable shadowing (e.g. `tasks` in `loadReassignTasks`) creates fragile code.

---

## Recommended Fix Priority

**Immediate (data loss / security risk):**
1. Fix all 8 XSS vectors (add `esc()` calls)
2. Fix sync race condition (`_dirtyTaskIds` clearing)
3. Fix WAL recovery for new tasks
4. Add confirmation to legacy CSV import
5. Fix dashboard infinite loop (set sentinel on fetch failure)

**Soon (incorrect behaviour visible to users):**
6. Fix `showToast` / `toast` naming
7. Fix changelog pagination
8. Fix cash runway formula
9. Fix capacity cache guard
10. Fix Gantt DST date math
11. Fix expense currency mixing
12. Fix hardcoded year 2026

**Planned (quality / maintainability):**
13. Standardise `fetch` vs `authFetch`
14. Add cycle protection to `getDepth`
15. Fix duplicate function definitions
16. Clean up dead variables in tactical dashboard
17. Extract shared kanban drag-drop utility
