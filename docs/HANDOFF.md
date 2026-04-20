# Handoff — 2026-04-20 Tech Debt Cleanup Complete

## What happened this session

### 1. Stale file audit
All pending task items (G1-G5, Kanban) were already shipped. `pending_tasks.md` hadn't been updated since 2026-04-15. Rewrote it, `conversation_context.md`, and this handoff from scratch.

### 2. False blocker removal
Three items listed as blocked were already resolved:
- **SMTP** — not needed. Email uses Microsoft Graph (`@azure/msal-node`, Azure AD creds in `.env`). Fully operational.
- **News LLM API key** — already set in `projects/news-aggregator/.env` (primary + failover).
- **News LLM pipeline** — not blocked.

### 3. Console call cleanup
- **server.js**: 3 `console.error` calls replaced with structured `log()`. Zero console calls remain.
- **Frontend**: 14 `console.log` calls removed (debug noise). 23 error-path calls guarded behind `window._nbiDebug` (silent in production, available via `window._nbiDebug = true` in browser console).

### 4. xlsx → exceljs vulnerability fix
Replaced `xlsx` (SheetJS) — HIGH severity, abandoned on npm, prototype pollution + ReDoS — with `exceljs` (actively maintained, zero known vulns).

**Server changes** (`dashboard-server/server.js`):
- `const XLSX = require('xlsx')` → `const ExcelJS = require('exceljs')`
- `parseExcelFile()` now `async`, uses `ExcelJS.Workbook().xlsx.readFile()` + row iterator
- Returns `rows` field (all data rows) alongside `sample` (first 5) when not in headersOnly mode
- Import endpoint uses `targetSheet.rows || targetSheet.sample` instead of inline XLSX re-read
- `scanDir()` now `async` with `await` on both `parseExcelFile` and recursive calls

**Frontend changes** (`nbi_project_dashboard.html`):
- Script tag: `xlsx.full.min.js` → `exceljs.min.js`
- `parseExcelPreview()` now `async`, uses `ExcelJS.Workbook().xlsx.load()` + `eachRow()`
- `handleFile()` caller handles the async return with `.catch()`
- Date formatting preserved (DD/MM/YYYY output from Date objects)

**Files removed**: `dashboard-server/public/vendor/xlsx.full.min.js`
**Files added**: `dashboard-server/public/vendor/exceljs.min.js` (copied from node_modules dist)
**Package**: `xlsx` uninstalled, `exceljs@^4.4.0` installed

**npm audit result**: HIGH vulnerability eliminated. 5 moderate remain (esbuild/vite/vitest chain — dev-only, not production, force-upgrade doesn't fix them).

---

## Git State

**Current branch:** master

**Master HEAD:** `40a3ab1` (last commit — tech debt changes are uncommitted)

**Uncommitted changes:**
- `dashboard-server/server.js` — ExcelJS swap + console.error→log()
- `nbi_project_dashboard.html` — ExcelJS swap + console.log cleanup
- `dashboard-server/package.json` + `package-lock.json` — xlsx→exceljs
- `dashboard-server/public/vendor/exceljs.min.js` — new vendor bundle
- `dashboard-server/public/vendor/xlsx.full.min.js` — deleted
- `docs/HANDOFF.md`, session logs, live state files — updated
- Various untracked session logs and spec files from prior sessions

---

## PM2 Status

| Service | Port | Status |
|---|---|---|
| nbi-dashboard | 8888 | online (needs restart after commit to pick up server.js changes) |
| nbi-news | 8890 | online |

---

## Tests

186/186 green (Vitest). Server boots clean with all crons registered.

---

## Awaiting Glen UAT

### Client Portal (merged `8b74230`)
- Client user login, forced password change, scoped views, team management

### News M4: Search + Admin (merged `40a3ab1`)
- Search subtab, admin panels (feeds, prompts, sources, stories)

---

## On Hold

| Item | Blocker |
|---|---|
| QuickBooks Time API | Bryan Rasmussen's API token |
| Excel import template | Glen to populate with real data and test |

---

## Backlog (needs brainstorming before code)

- Gantt enhancements (dependency arrows)
- SoW hierarchy layer
- Hiring page full spec
- Telemetry + BI Analytics Dashboard
- Real research backend (Brave/Tavily/Anthropic)
- Standup on Projects "By Project" view (brainstorming was in progress in earlier session)

---

## Context budget directive

Glen's instruction: do NOT load full `work_completed.md` into context. Read only the tail (~50 lines) at session start. Search older entries on demand. The file is 800+ lines and growing.

---

## Key Files

| File | Purpose |
|---|---|
| `dashboard-server/server.js` | All backend logic (9,105 lines) |
| `nbi_project_dashboard.html` | All frontend logic (20,022 lines) |
| `projects/nbi_dashboard/live_state/` | Session-persistent state files |
| `projects/nbi_dashboard/session_logs/` | Append-only session logs |
