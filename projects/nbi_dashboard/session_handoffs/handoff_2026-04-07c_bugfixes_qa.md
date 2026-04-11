# Session Handoff — 2026-04-07c (Bug Fixes + Full QA)

## Session Overview
Picked up from handoff_2026-04-07b. Fixed all P1/P2 bugs from prior QA, built new features (My Tasks view, Hide Done filter), ran comprehensive end-to-end QA (57 tests), found and fixed 12 additional bugs.

## Server State
- **Port:** 8888 (managed by PM2, auto-restarts on crash, starts on Windows boot)
- **PM2 process:** `nbi-dashboard` (id 0)
- **DB:** postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard
- **PM2 commands:** `pm2 status`, `pm2 restart nbi-dashboard`, `pm2 logs nbi-dashboard`

## Logins (all passwords reset to nbi2026, case-insensitive usernames)
| Username | Role | Notes |
|---|---|---|
| glen | admin | Full access |
| tom | admin | Expense approver |
| magnus | member | Has page access: finances, expenses, leads |
| amir, bryan, devin, jeff, jessica, patrice, ruan, stavros | member | Default access |
| testmember | member | Test account |

---

## Bugs Fixed This Session

### From Prior QA (P1/P2)
1. **Screenshot capture broken** — CSP blocked cdnjs.cloudflare.com + html2canvas can't parse CSS color() function. Fixed: CSP whitelist + onclone workaround + error handling.
2. **Browser freeze with 1,123 tasks** — All DOM nodes rendered synchronously. Fixed: lazy rendering for collapsed tree nodes, 50-task Gantt cap, 50-card board lane cap, 250-day max date range.
3. **Finance PUT race condition** — No conflict detection. Fixed: optimistic concurrency with version tracking (GET returns version, PUT accepts expectedVersion, 409 on conflict).
4. **Pipeline NaN** — GROUP BY l.currency created separate rows per currency including NULL. Fixed: removed currency from GROUP BY.
5. **People view duplicates** — "Glen" vs "Glen Pryer" shown as separate people. Fixed: normaliseAssignees() merges partial names + DB assignees consolidated.
6. **Account lockout** — Threshold too high (10). Lowered to 5, added logging.
7. **XSS in emails** — display_name unescaped in HTML email. Fixed: escHtml() applied.

### Found During This Session
8. **Finance data corruption** — Editing employerCostPct saved only that field, wiping revenue/payroll. ROOT CAUSE: `finSaveEdit('_root', ...)` modified the data object correctly but the object had been loaded from a partial DB row. Fixed: client-side + server-side integrity checks block saves missing revenue/payroll arrays. Finance data restored from row 1 (original full data).
9. **Finance version not tracked on login** — `loadFinanceFromDB()` called without await, so `_financeVersion` stayed 0 and all saves got 409 Conflict. Fixed: added `await` on both init paths.
10. **Timeline completely broken** — Three functions never written: `ganttTaskEnd()`, `ganttDayCols()`, `ganttBarClass()`. All referenced but undefined. Fixed: wrote all three.
11. **DD/MM/YYYY dates showing "Invalid Date"** — 23 instances of `new Date(dueDate + 'T00:00:00')` can't parse British date format. Fixed: global replace with `safeParseDate()` which handles both ISO and DD/MM/YYYY.
12. **Invalid UUID returns 500** — PostgreSQL throws on non-UUID string. Fixed: UUID regex validation on task GET route.
13. **Non-admin can create/edit tasks** — POST /api/tasks and PATCH /api/tasks/:id had no admin check. Fixed: admin checks added to 17 write routes (tasks, clients, leads, contacts, notes, templates, import, bulk ops).
14. **CSP blocking FX rate APIs** — connect-src 'self' blocked frankfurter.dev and open.er-api.com. Fixed: added to CSP.
15. **sync/load blocked for non-admin** — 403 for member role users (blank page). Fixed: changed to require auth only, not admin.
16. **Jira Integration Tutorial wrong client** — Was Lighthouse, should be Couch Heroes. Fixed: client_id updated, title cleaned.
17. **Magnus login failing** — Password was nbi2026! (8 chars) from previous session. Reset to nbi2026. All user passwords standardised.

---

## Features Built This Session

### My Tasks View (new)
- Dedicated personal task dashboard at `switchView('mytasks')`
- Sidebar item "My Tasks (188)" navigates to it
- KPI row: Active, Need Attention, In Progress, Completion %, Hours Tracked
- 5 sections: Critical & Blocked (red border), Overdue (amber border), In Progress, Upcoming, Completed (collapsed)
- Sort buttons: Priority, Due Date, Client, Status
- Click any task → navigates to Tasks view and opens detail panel
- Priority sort weight: Critical ACT > Urgent > High > Medium > Low, then health, then due date

### Timeline (Gantt) — Fixed and Enhanced
- "Hide Done" checkbox (checked by default)
- 50-task render cap with "Show More" button
- Date range clamped to +/- 6 months from today (max 250 days)
- Coloured bars: blue (in progress), green (done), grey (not started), purple (blocked)
- Lightweight CSS grid background instead of per-day-per-row divs

### Pipeline KPI Cards Restructured
- Leads with Won value (£725k, 3 deals) instead of deceptive "28 active deals"
- Average deal size from won deals only
- Couch Heroes added as Won contract (£350k/year)
- Sarge deal moved from Won to Negotiation (75% probability)

### Page Permissions Server-Side
- Moved from localStorage (Glen's browser only) to PostgreSQL settings table
- All users load permissions from `GET /api/settings` → `page_permissions` key
- Admin changes sync to DB via `PUT /api/settings/page_permissions`
- Magnus granted: finances, expenses, leads

### PM2 Process Manager
- `pm2-windows-startup` installed — auto-starts on Windows boot
- Auto-restart on crash
- Logs: `pm2 logs nbi-dashboard`

---

## QA Results (57 tests)

### Round 1 — Smoke (17 views): ALL PASS
Every view renders without crash, NaN, Invalid Date, or console errors. Both admin (Glen) and member (Magnus) tested.

### Round 2 — API Functional (28 tests): 26 pass, 2 fixed
Task CRUD, Lead CRUD, Expense CRUD, Finance save/conflict, Bug reports, Auth edge cases, Non-admin restrictions, XSS, Settings, Health check.

### Round 3 — Deep Functional (22 tests): ALL PASS
Finance inline editing (corruption path verified fixed), Expense report full workflow (create→add→submit→Tom approves), Notifications, Exports (ZIP), Deep links, Browser back/forward, Edge cases (empty title, long text, special chars), Concurrent edit detection.

### Round 4 — Infrastructure (8 tests): ALL PASS
Drag sim (status, reparent, date), File upload, Sync poll, History state.

### Round 5 — Security (7 tests): ALL PASS
Password reset (no info leak), Invalid token, Password change validation, Non-admin write blocks.

### Known P3 (not fixed)
- Mobile: sidebar doesn't auto-collapse at narrow widths (horizontal overflow)
- Accessibility: minimal ARIA labels (from prior UI/UX audit)

---

## File Locations
- Dashboard HTML: `nbi_project_dashboard.html` (root, ~11,800 lines)
- Server: `dashboard-server/server.js` (~4,300 lines)
- Server config: `dashboard-server/.env`
- PM2 config: managed via CLI (`pm2 save` persists to `~/.pm2/dump.pm2`)
- Finance data: PostgreSQL `finance_data` table (append-only, latest row = current, row 34 is latest)
- Page permissions: PostgreSQL `settings` table, key `page_permissions`
- Session handoffs: `projects/nbi_dashboard/session_handoffs/`
