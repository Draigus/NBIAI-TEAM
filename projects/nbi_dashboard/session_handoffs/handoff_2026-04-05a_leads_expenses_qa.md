# Handoff — 2026-04-05a: Leads Tracker, QA Fixes, Expenses

## What was done

### 1. Client Leads Tracker (fully built and tested)
- **Migration:** `dashboard-server/migrate-leads.js` — 7 tables, seed data (8 pipeline stages, 20 resource types, 26 field options)
- **API:** ~300 lines in server.js — config CRUD, leads CRUD, resources, activities, pipeline analytics, forecast, reminders
- **Frontend:** ~800 lines — 4 views (kanban, table, pipeline, by-client), detail panel, quick-add modal, settings config, follow-up badge
- **All data-driven** per Glen's directive (D3): stages, field options, resource types, sectors all from DB
- **Segment tabs:** All Clients / Gaming / Human Capital (D4)
- **Multi-currency:** GBP/USD/EUR with FX rates in settings (D8)
- **Deal owners:** Glen/Tom only via field_options (D5)
- **Win probability:** Always manual (D6)
- **Closed deals:** Always visible (D9)

### 2. QA Pass + Security Fixes
**Critical security fixes in server.js:**
- Line 31: `express.static(path.join(__dirname, '..'))` was exposing entire parent directory including CLAUDE.md, .env, all project files. Replaced with explicit route serving only `nbi_project_dashboard.html`.
- Line 546: Path traversal on `/api/attachments/:filename` — no validation. Added `path.resolve()` check.
- Lines 147, 164, 175: User CRUD (create/delete/update) had no admin role check. Added.
- Lines 245, 277: Backup/restore had no admin role check. Added.

**Frontend fixes:**
- XSS via stage colours — added `safeColour()` validator on all 5 colour injection points
- Hardcoded £ in mixed-currency pipeline/kanban/client views — removed
- `updateLeadResource()` not refreshing detail panel — added refresh call
- `submitNewLead()` silently proceeding with null client_id on failure — added error handling
- `sortLeadsForTable()` null title crash — added guard

**Tech debt:**
- Added global Express error handler for unhandled async errors

### 3. File Attachments Bug (Glen-reported)
- **Root cause:** `<a href="/api/attachments/...">` opened in new tab without auth token → 401
- **Fix:** Downloads now use `authFetch()` + blob + programmatic download. Also added delete button per attachment.

### 4. Expense Reports (new feature)
- **Migration:** `dashboard-server/migrate-expenses.js` — 3 tables, 9 categories
- **API:** Full CRUD + receipt upload/delete + admin summary + status workflow
- **Frontend:** Sidebar item, table with filters, KPI cards, detail panel, new expense modal, receipt management
- **Access:** Members see/edit own pending only; admins see all + approve/reject
- **Route fix:** `/api/expenses/summary` moved before `/api/expenses/:id` to prevent Express collision

## Current state

### Server
- Running on port 8888
- All API endpoints tested via curl
- PostgreSQL at `postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard`
- Dashboard URL: `http://localhost:8888/` or `http://localhost:8888/nbi_project_dashboard.html`

### Auth
- Glen's password was changed from default (not `nbi2026`) — use existing session token or reset
- Valid tokens retrievable via: `node -e "const{Pool}=require('pg');const p=new Pool({connectionString:'...'});p.query('SELECT token,username FROM sessions WHERE expires_at>NOW()').then(r=>{console.log(r.rows);p.end()})"`

### Files modified
- `dashboard-server/server.js` — security fixes, admin guards, expense API, error handler
- `dashboard-server/migrate-leads.js` — already run
- `dashboard-server/migrate-expenses.js` — already run
- `nbi_project_dashboard.html` — leads tracker frontend, expense reports frontend, attachment fix, security fixes

## Decisions log
- D3: Everything data-driven, no hardcoded values
- D4: Segment tabs (All / Gaming / Human Capital)
- D5: Deal owners = Glen, Tom only
- D6: Win probability = always manual
- D7: SEK billed as GBP
- D8: Multi-currency GBP/USD/EUR with FX rates in settings
- D9: Closed deals always visible
- D10: No Excel import, manual entry only
- D11: Follow-up reminders with badges and highlighting
- D12: Full QA + tech debt review after leads tracker complete

## What's next
- **Glen UAT:** Glen reviews the finished leads tracker, expense reports, and attachment fixes
- **QuickBooks Time API:** On hold pending API token from Bryan Rasmussen (CFO)
- **No other pending items** — backlog is clear
