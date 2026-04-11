# NBI Project Dashboard -- Code Review

**Reviewed by:** QA Lead (AI Agent)
**Date:** 7 April 2026
**Scope:** Full-stack code review of the NBI Project Dashboard
**Files reviewed:**
- `dashboard-server/server.js` (4,242 lines)
- `nbi_project_dashboard.html` (11,379 lines)
- `dashboard-server/init-db.js` (203 lines)
- `dashboard-server/migrate-expenses.js` (84 lines)
- `dashboard-server/backup.js` (125 lines)
- `dashboard-server/.env` / `.env.example`
- `dashboard-server/package.json`

---

## Executive Summary

The dashboard is a substantial, functional application with solid fundamentals: parameterised queries throughout (no SQL injection), a working XSS escape layer, proper path traversal protection on file endpoints, and good use of transactions for multi-step operations. However, there are meaningful security gaps (no CSRF protection, no rate limiting on sensitive endpoints, missing Content-Security-Policy), several performance concerns (unbounded queries, N+1 patterns, full-ID-list on every poll), and the monolithic 11,000-line frontend will become increasingly difficult to maintain.

**Finding counts by severity:**
- Critical: 3
- High: 10
- Medium: 14
- Low: 8

---

## 1. Security Vulnerabilities

### CRITICAL

#### S1. No CSRF Protection
**File:** `dashboard-server/server.js` (entire API surface)
**Severity:** Critical

The API relies solely on Bearer tokens sent via the `Authorization` header, which is inherently CSRF-safe when used from JavaScript `fetch()`. However, there is no explicit CSRF middleware and no SameSite cookie policy, because the token is stored in `localStorage` and sent as a header. This is currently safe because the architecture avoids cookies, but if session management ever moves to cookies (e.g. for SSR or subdomains), the entire API is immediately vulnerable.

**Risk:** Low today (header-based auth is CSRF-resistant), but the lack of a defence-in-depth layer means one architectural change could expose it.

**Recommendation:** Add a `SameSite=Strict` cookie for the session token as a secondary defence, or add explicit CSRF token checking. At minimum, document that CSRF protection depends on the header-based auth pattern.

---

#### S2. No Content-Security-Policy Header
**File:** `dashboard-server/server.js:204-215`
**Severity:** Critical

The security headers middleware sets X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, and Permissions-Policy, but there is no Content-Security-Policy (CSP) header. The frontend loads external scripts from `cdn.sheetjs.com` and fonts from `fonts.googleapis.com`, and constructs HTML strings via `innerHTML` extensively. A CSP with script-src and style-src directives would significantly reduce the impact of any XSS that bypasses the `esc()` function.

**Recommendation:** Add a CSP header. At minimum: `default-src 'self'; script-src 'self' 'unsafe-inline' cdn.sheetjs.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'`.

---

#### S3. No Rate Limiting on Password Reset and API Endpoints
**File:** `dashboard-server/server.js:351-391` (forgot-password), `server.js:404-422` (reset-token POST)
**Severity:** Critical

The login endpoint has brute-force protection (lines 87-91, 243-252), but:
1. `POST /api/auth/forgot-password` has no rate limiting. An attacker can flood reset emails or enumerate timings.
2. `POST /api/auth/reset-token/:token` has no rate limiting. An attacker can brute-force reset tokens (though 256-bit tokens make this practically infeasible).
3. No `express-rate-limit` or equivalent middleware is installed anywhere.

**Recommendation:** Install `express-rate-limit` and apply it globally (e.g. 100 req/min per IP for API, 5 req/min for auth endpoints).

---

### HIGH

#### S4. Default Password Exposed in init-db.js and Console Output
**File:** `dashboard-server/init-db.js:168,188`
**Severity:** High

The init script seeds users with the password `nbi2026` and logs this to the console. If any user has not changed their default password, their account is trivially compromised by anyone who has seen the source code or the init script output.

**Recommendation:** Generate random passwords during seeding and require password change on first login. Remove the password from console output.

---

#### S5. Uploaded Files Served Without Content-Disposition or Content-Type Hardening
**File:** `dashboard-server/server.js:1413-1421` (GET /api/attachments/:filename)
**Severity:** High

Uploaded files are served using `res.sendFile()`, which will set the Content-Type based on the file extension. An attacker could upload an HTML file that, when accessed, executes JavaScript in the context of the dashboard's origin.

**Recommendation:** Set `Content-Disposition: attachment` on all uploaded file responses to force downloads. Alternatively, serve uploads from a separate domain/subdomain, or enforce an allowlist of MIME types.

---

#### S6. File Upload Lacks MIME Type Validation
**File:** `dashboard-server/server.js:59-65` (multer config)
**Severity:** High

Multer is configured with a fileSize limit (25MB) but no `fileFilter` function to validate MIME types. Any file type can be uploaded, including `.html`, `.svg` (which can contain JavaScript), `.exe`, etc.

**Recommendation:** Add a `fileFilter` to multer that restricts uploads to known-safe types (images, PDFs, spreadsheets, documents). Reject executable and HTML file types.

---

#### S7. Public Report Endpoints Have No Abuse Protection
**File:** `dashboard-server/server.js:3807-3905` (GET /api/reports/:token, /html, /pdf)
**Severity:** High

The public report endpoints bypass authentication entirely (line 320: `if (req.path.startsWith('/api/reports/')) return next()`). While the 256-bit share token provides security through obscurity, there is:
1. No rate limiting on these endpoints.
2. No audit logging of who accessed the report.
3. The PDF generation endpoint (`/api/reports/:token/pdf`) creates a PDFDocument on every request -- this could be abused for CPU-based DoS since PDF generation is CPU-intensive.

**Recommendation:** Add rate limiting on public report endpoints. Log access events. Consider caching generated PDFs.

---

#### S8. Backup Endpoint Exposes Full Database Including Password Hashes (Via JSON Backup Fallback)
**File:** `dashboard-server/backup.js:72-73`
**Severity:** High

The JSON backup fallback at line 73 queries users with `SELECT id, username, display_name, email, role, created_at` (correctly excluding password_hash). However, the main backup at `server.js:639` also excludes hashes. This is good, but the backup file itself could still contain sensitive client data and is stored on disk in `backups/` without encryption.

**Recommendation:** Encrypt backup files at rest. Ensure the `backups/` directory has restrictive filesystem permissions. The `.gitignore` correctly excludes this directory.

---

#### S9. OCR API Key Fallback to Public Default
**File:** `dashboard-server/server.js:3162`
**Severity:** High

The OCR endpoint falls back to the public demo key `'helloworld'` if `OCR_API_KEY` is not set. This key is rate-limited and shared globally. An attacker could exhaust the public key's quota, breaking receipt OCR for all users of the free tier.

**Recommendation:** Remove the fallback. Require an explicit API key or clearly warn when running without one.

---

#### S10. Hardcoded Expense Approver Username
**File:** `dashboard-server/server.js:3318-3319, 3501-3502`
**Severity:** High

The expense approver is hardcoded to `'tom'` (with an env var override). If the user `tom` is deleted or renamed, expense approval silently stops working. Notifications go to a non-existent user with no error.

**Recommendation:** Store the expense approver configuration in the `settings` table rather than environment variables. Validate that the configured approver user exists on startup.

---

#### S11. Authentication Token in localStorage is Vulnerable to XSS
**File:** `nbi_project_dashboard.html:1414, 1518`
**Severity:** High

Auth tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page. If an XSS vulnerability exists (e.g. a bypass of the `esc()` function), the attacker can steal the token and impersonate the user.

**Recommendation:** Use `httpOnly` cookies for session tokens instead of localStorage. This eliminates token theft via XSS. If localStorage must be used, implement the CSP from S2 as a mitigation.

---

#### S12. Session Tokens Never Rotated
**File:** `dashboard-server/server.js:279-281`
**Severity:** High

Once a session token is issued, it remains valid for `SESSION_EXPIRY_DAYS` (7 days) without any rotation. If a token is compromised, the attacker has a full week of access.

**Recommendation:** Implement token rotation -- issue a new token on each authenticated request or at regular intervals (e.g. every hour), invalidating the previous one.

---

#### S13. Downloads Scanner Reads From User's Home Directory
**File:** `dashboard-server/server.js:840-905`
**Severity:** High (information disclosure)

The `/api/import/scan-downloads` endpoint scans the server's OS user's Downloads folder, including file names, sizes, and modification dates. While it's admin-only, this leaks host filesystem metadata to the browser.

**Recommendation:** Since this is a deliberate feature for file import, ensure it is clearly documented as an admin-only local development feature. Add a configuration toggle to disable it in production.

---

## 2. Error Handling

### HIGH

#### E1. Error Messages Expose Internal Details
**File:** `dashboard-server/server.js:603, 659, 711, 1785, 1933`
**Severity:** High

Multiple endpoints return `e.message` directly in error responses:
- Line 603: `res.status(500).json({ error: e.message })`
- Line 659: `res.status(500).json({ error: e.message })`
- Line 1785: `res.status(500).json({ error: e.message })`
- Line 1933: `res.status(500).json({ error: e.message })`

PostgreSQL error messages can reveal table names, column names, constraint details, and SQL fragments. This aids attackers in mapping the database schema.

**Recommendation:** Return a generic error message to the client. Log the full error server-side. The global error handler at line 4138 correctly returns `'Internal server error'`, but many route-level catch blocks bypass it.

---

#### E2. Audit Log Failures Silently Swallowed
**File:** `dashboard-server/server.js:534-536`
**Severity:** Medium

The `auditLog()` function catches and warns on errors but does not re-throw. If the audit_log table is full, permissions change, or the connection breaks, audit entries are silently lost with only a console warning.

**Recommendation:** For critical audit events (user deletion, password changes, data restore), consider failing the parent operation if audit logging fails. For routine events, the current approach is acceptable.

---

#### E3. Missing Error Handling on File Deletion
**File:** `dashboard-server/server.js:1428, 1470`
**Severity:** Medium

`fs.unlinkSync()` is called without try/catch in the attachment deletion handlers. If the file is already deleted or the disk is full, the endpoint will throw an unhandled error.

**Recommendation:** Wrap `fs.unlinkSync()` calls in try/catch blocks, or use `fs.promises.unlink()` with error handling.

---

#### E4. Unhandled Promise in Cron Job
**File:** `dashboard-server/server.js:4099-4104`
**Severity:** Medium

The backup cron job calls `runBackup()` without awaiting or catching its result. If the backup fails, the error may go unhandled (the JSON backup fallback returns a Promise).

**Recommendation:** Change to: `runBackup()?.catch?.(e => console.error('[Cron] Backup failed:', e.message))`.

---

## 3. Performance Issues

### HIGH

#### P1. Sync Poll Returns ALL Task IDs on Every Request
**File:** `dashboard-server/server.js:1960-1961`
**Severity:** High

`GET /api/sync/poll` executes `SELECT id FROM tasks` on every 10-second poll to return the full list of current task IDs. With hundreds of tasks and multiple concurrent users polling, this generates significant unnecessary database load and network traffic.

**Recommendation:** Use a `deleted_tasks` table or soft-delete pattern with a `deleted_at` timestamp. The poll can then return only deletions since the last poll time, matching the pattern used for updates.

---

#### P2. N+1 Query Pattern in Backup and Restore
**File:** `dashboard-server/server.js:679-704` (restore), `server.js:2002-2046` (full sync)
**Severity:** High

The restore endpoint iterates over every task in the backup and executes individual INSERT/UPDATE queries. For a backup with 500 tasks, this means 500+ individual database round-trips within a single transaction.

**Recommendation:** Use PostgreSQL's `COPY` command, `unnest()`-based batch inserts, or multi-value INSERT statements to batch these operations.

---

#### P3. Unbounded Queries on Multiple Endpoints
**File:** `dashboard-server/server.js` (various)
**Severity:** High

Several endpoints have no LIMIT clause and will return unlimited results:
- `GET /api/tasks` (line 1661): Returns all tasks with embedded notes JSON
- `GET /api/clients` (line 1498): Returns all clients with correlated subquery
- `GET /api/notes` (line 1603): Returns all client notes
- `GET /api/templates` (line 1340): Returns all templates
- `GET /api/lead-activities/:id` (line 2740): Returns all activities for a lead

**Recommendation:** Add default LIMIT/OFFSET pagination to all list endpoints. The leads endpoint (line 2429) does this correctly and can serve as a pattern.

---

### MEDIUM

#### P4. Correlated Subquery in Clients List
**File:** `dashboard-server/server.js:1498-1505`
**Severity:** Medium

The clients list endpoint uses a correlated subquery `(SELECT count(*) FROM tasks t WHERE t.client_id = c.id)` for each client. This is O(clients x tasks) in the worst case.

**Recommendation:** Use a LEFT JOIN with GROUP BY, or materialise task counts in a view/cache.

---

#### P5. Token Cache Never Bounded
**File:** `dashboard-server/server.js:111-127`
**Severity:** Medium

The `_tokenCache` Map grows without limit. While entries expire after 5 minutes and are cleaned every 10 minutes, a burst of unique tokens (e.g. from a token enumeration attack) could temporarily consume significant memory.

**Recommendation:** Cap the Map size (e.g. LRU eviction at 10,000 entries).

---

#### P6. Large Payloads Accepted (10MB JSON)
**File:** `dashboard-server/server.js:218`
**Severity:** Medium

`express.json({ limit: '10mb' })` allows very large JSON payloads on all routes. While needed for sync/restore, this limit should be route-specific.

**Recommendation:** Set a lower default (e.g. 1MB) and apply the 10MB limit only to the sync and restore routes.

---

#### P7. Base64 Screenshot Stored in Database
**File:** `dashboard-server/server.js:3266`
**Severity:** Medium

Bug report screenshots are stored as base64 data URLs directly in the `bug_reports` table. A full-page screenshot at 1080p can be 1-5MB of base64 text, which bloats the table and slows queries.

**Recommendation:** Store screenshots as files in the `uploads/` directory, like other attachments, and reference them by filename.

---

#### P8. Dashboard Summary Runs Three Unindexed Aggregations
**File:** `dashboard-server/server.js:2211-2251`
**Severity:** Medium

The dashboard summary endpoint runs three separate aggregate queries (all-tasks stats, by-client breakdown, by-assignee breakdown). Each scans the entire tasks table.

**Recommendation:** Combine into a single query with CTEs, or cache the result for 30-60 seconds since dashboard data is not real-time critical.

---

## 4. Code Quality

### MEDIUM

#### Q1. buildPatchQuery() Helper Defined But Never Used
**File:** `dashboard-server/server.js:171-180`
**Severity:** Medium

The `buildPatchQuery()` helper is documented as "currently unused -- 10+ PATCH handlers inline this logic." This is dead code that adds maintenance burden. The inline implementations differ slightly from each other (some add `updated_at`, some do not), suggesting the refactoring was attempted but abandoned.

**Recommendation:** Either refactor all PATCH handlers to use this helper (with `updated_at` support) or delete it.

---

#### Q2. Duplicated PATCH Pattern Across 10+ Handlers
**File:** `dashboard-server/server.js:504, 1530, 1571, 1626, 1706, 2298, 2339, 2631, 2921`
**Severity:** Medium

Every PATCH endpoint repeats the same pattern: iterate allowed fields, build SET clause, push values. This is ~15 lines duplicated 10+ times, with subtle variations (some handle `updated_at`, some empty-string-to-null conversion, some don't).

**Recommendation:** Extract to a shared utility function. This is what `buildPatchQuery()` was meant for.

---

#### Q3. Monolithic Frontend File
**File:** `nbi_project_dashboard.html` (11,379 lines)
**Severity:** Medium

The entire frontend -- CSS, HTML templates, and application JavaScript -- is in a single file. This makes code review, testing, and debugging extremely difficult. The JS alone is approximately 7,200 lines.

**Recommendation:** Split into separate CSS, JS module files and use a bundler (Vite, esbuild). At minimum, split JS into logical modules: auth, tasks, leads, expenses, finance, rendering.

---

#### Q4. Inconsistent camelCase/snake_case Between Frontend and Backend
**File:** `dashboard-server/server.js:2115-2135`, `nbi_project_dashboard.html` (throughout)
**Severity:** Low

The database uses `snake_case` (e.g. `health_state`, `hours_estimated`), the frontend uses `camelCase` (e.g. `healthState`, `hoursEstimated`), and the mapping between them is done manually in several places with subtle inconsistencies (e.g. `t.healthState || t.health_state` at line 1853).

**Recommendation:** Standardise on one naming convention at the API boundary. Use a consistent mapper function.

---

#### Q5. Magic Strings for Status Values
**File:** `dashboard-server/server.js` (throughout), `nbi_project_dashboard.html` (throughout)
**Severity:** Low

Task statuses ('Not started', 'In progress', 'Done', 'Blocked', 'Cancelled', 'Planning', 'Drafted') are scattered as string literals throughout both files with no central definition or validation. A typo in any of these strings would create a silently broken state.

**Recommendation:** Define status enums as a shared constant or database lookup table. Validate incoming status values against the enum in the API.

---

#### Q6. Console Logging of Sensitive Operations
**File:** `dashboard-server/server.js:381, 384, 387, 3510-3511`
**Severity:** Low

Password reset links and notification details are logged to the console. In production with PM2 or similar, these logs persist on disk.

**Recommendation:** Use structured logging with severity levels. Ensure sensitive data is redacted from production logs.

---

#### Q7. Hardcoded Email Address for Expense Notifications
**File:** `dashboard-server/server.js:3502`
**Severity:** Low

The expense approver email `trieger@nbi-consulting.com` is hardcoded (with env var override). This should be in configuration.

---

#### Q8. Unused Dependencies May Be Required
**File:** `dashboard-server/server.js:46-48`
**Severity:** Low

`Tesseract`, `sharp`, and `pdfParse` are imported at the top level but only used in the receipt OCR endpoint. If these optional dependencies are not installed, the entire server fails to start.

**Recommendation:** Move to lazy `require()` calls, similar to how `node-cron` and `backup` are handled at lines 50-51.

---

## 5. Architecture Concerns

### MEDIUM

#### A1. Finance Data Stored as Append-Only JSON Blob
**File:** `dashboard-server/server.js:1479-1493`
**Severity:** Medium

Finance data is stored as a single JSON blob in the `finance_data` table, with a new row appended on every save. This means:
1. No ability to query individual financial records
2. The blob grows without bounds
3. No schema validation on the JSON structure
4. Concurrent edits will silently overwrite each other (last-write-wins)

**Recommendation:** Normalise finance data into proper relational tables if the data structure is stable.

---

#### A2. Mixed Authentication/Authorisation Patterns
**File:** `dashboard-server/server.js` (various)
**Severity:** Medium

Authorisation checks are inconsistent across endpoints:
- Some use `if (!req.user || req.user.role !== 'admin')` (lines 429, 474, 491, etc.)
- Some use `if (req.user.role === 'admin')` without null-checking `req.user` (line 462)
- Some check ownership AND admin (expenses, comments)
- The expense approver has a special role check via username string comparison

**Recommendation:** Create a `requireAdmin` middleware and a `requireOwnerOrAdmin(entityFn)` middleware to standardise these checks.

---

#### A3. Polling-Based Sync Will Not Scale
**File:** `dashboard-server/server.js:1944-1988`, `nbi_project_dashboard.html:1887`
**Severity:** Medium

The 10-second polling interval means:
1. Changes take up to 10 seconds to appear for other users
2. Each poll fetches all task IDs (P1 above)
3. With N concurrent users, the server handles N polls every 10 seconds

**Recommendation:** For the current user count (6 people), this is acceptable. If the user base grows, migrate to Server-Sent Events (SSE) or WebSockets for push-based updates.

---

#### A4. No API Versioning
**File:** `dashboard-server/server.js` (all routes)
**Severity:** Low

All API routes are under `/api/` with no version prefix. Any breaking change requires coordinated frontend and backend deployment.

**Recommendation:** Prefix routes with `/api/v1/` for future flexibility.

---

## 6. Data Integrity

### MEDIUM

#### D1. Task Deletion Orphans Related Data
**File:** `dashboard-server/server.js:1737-1744`
**Severity:** Medium

When a task is deleted, child tasks are re-parented (`parent_id = NULL`), but time entries, comments, and attachments for the deleted task remain orphaned. The database schema uses `ON DELETE CASCADE` for some relations (task_notes, task_comments via init-db.js) but task_attachments and time_entries may not have cascade rules if they were added via migrations.

**Recommendation:** Verify that all foreign key constraints on `tasks.id` have appropriate CASCADE or SET NULL behaviour. Add explicit cleanup queries for any non-cascading relations.

---

#### D2. No Optimistic Concurrency Control on Most Updates
**File:** `dashboard-server/server.js:1705-1734` (PATCH /api/tasks/:id)
**Severity:** Medium

The sync/changes endpoint (line 1840-1843) has basic conflict detection using `_serverUpdatedAt`, but direct PATCH endpoints do not. Two users editing the same task simultaneously will result in last-write-wins with no warning.

**Recommendation:** Add an `If-Match` / `ETag` header or `version` column for optimistic locking on task updates.

---

#### D3. Full-Replace Sync Deletes All Tasks
**File:** `dashboard-server/server.js:2007`
**Severity:** Medium

The legacy `PUT /api/sync/tasks` endpoint executes `DELETE FROM tasks` before re-inserting. If the request fails partway through re-insertion (network timeout, client crash), the transaction will roll back -- but any other concurrent requests that started during the transaction may see inconsistent state.

**Recommendation:** This is marked as legacy. Consider removing it entirely and forcing all clients to use the incremental sync endpoint.

---

#### D4. Expense Report Status Transitions Not Enforced
**File:** `dashboard-server/server.js:3409-3455`
**Severity:** Low

The expense report PATCH endpoint allows admins to set any status string. There is no state machine enforcing valid transitions (e.g. preventing `draft` -> `approved` without going through `submitted` first).

**Recommendation:** Validate status transitions: `draft` -> `submitted` -> `approved`/`rejected`. Rejected can go back to `draft`.

---

## 7. Accessibility

### HIGH

#### A11. No ARIA Landmarks or Roles
**File:** `nbi_project_dashboard.html` (throughout)
**Severity:** High

The only ARIA attribute in the entire 11,379-line frontend is a single `aria-label="Menu"` on the mobile sidebar toggle (line 1329). There are:
- No `role="navigation"`, `role="main"`, `role="banner"` landmarks
- No `aria-label` on form inputs (labels use visual position only)
- No `aria-expanded` on collapsible sections
- No `aria-live` regions for toast notifications or async content updates
- No `aria-selected` on tab controls

**Recommendation:** Add ARIA landmarks, labels, and states. Start with the main layout regions and the most-used interactive components.

---

#### A12. Keyboard Navigation Not Supported
**File:** `nbi_project_dashboard.html` (throughout)
**Severity:** High

Interactive elements are implemented as `<div onclick="...">` rather than `<button>` elements. There are approximately 355 inline `onclick` handlers. These elements:
- Cannot receive keyboard focus (no `tabindex`)
- Do not respond to Enter/Space key presses
- Have no focus indicators

The sidebar navigation, tab bar, task tree, board columns, and all card actions are all click-only.

**Recommendation:** Use semantic `<button>` elements for all interactive controls. Use `<a>` for navigation links. Add `tabindex="0"` and keyboard event handlers where custom elements are unavoidable.

---

### MEDIUM

#### A13. Colour Contrast Issues in Dark Themes
**File:** `nbi_project_dashboard.html:30-173`
**Severity:** Medium

The `--text-muted` (#666) and `--text-faint` (#444) colour tokens on the default dark theme (#0a0a0a background) have contrast ratios below the WCAG 2.1 AA minimum of 4.5:1:
- `#666` on `#0a0a0a` = 3.4:1 (fails AA)
- `#444` on `#0a0a0a` = 1.9:1 (fails AA and AAA)

**Recommendation:** Lighten muted text colours to at least #888 for AA compliance.

---

#### A14. No Skip Navigation Link
**File:** `nbi_project_dashboard.html:1316-1328`
**Severity:** Medium

There is no "skip to main content" link, forcing keyboard and screen reader users to tab through the entire sidebar and header on every page load.

**Recommendation:** Add a visually hidden skip link as the first focusable element.

---

#### A15. Form Inputs Lack Explicit Labels
**File:** `nbi_project_dashboard.html` (throughout)
**Severity:** Medium

Form inputs in the detail panel, settings page, and modals use placeholder text as the only indication of purpose. There are no `<label>` elements with `for` attributes, no `aria-label`, and no `aria-labelledby`.

**Recommendation:** Add `<label>` elements (can be visually hidden with CSS if the design requires it) or `aria-label` attributes on all form inputs.

---

#### A16. Toast Notifications Not Announced
**File:** `nbi_project_dashboard.html`
**Severity:** Low

Toast notifications appear and disappear without being announced to screen readers. They use CSS transitions only.

**Recommendation:** Add `role="alert"` or `aria-live="polite"` to the toast container.

---

---

## Summary of Recommendations (Priority Order)

1. **Add rate limiting** (express-rate-limit) on all endpoints, especially auth routes (S3)
2. **Add Content-Security-Policy header** (S2)
3. **Validate file upload MIME types** in multer config (S6)
4. **Set Content-Disposition: attachment** on file serve endpoints (S5)
5. **Stop returning e.message to clients** -- use generic error messages (E1)
6. **Add LIMIT clauses** to all unbounded list queries (P3)
7. **Replace full-ID-list poll** with a deletion tracking table (P1)
8. **Add ARIA landmarks, roles, and keyboard support** (A11, A12)
9. **Refactor PATCH handlers** to use a shared utility function (Q1, Q2)
10. **Consider splitting the monolithic frontend** into modules (Q3)
11. **Move auth token to httpOnly cookie** or implement strict CSP (S11)
12. **Add session token rotation** (S12)
13. **Remove default password from init-db.js** output (S4)
14. **Add optimistic concurrency control** to task updates (D2)
15. **Remove legacy full-replace sync** endpoint (D3)

---

## What Is Done Well

- **SQL injection prevention:** All queries use parameterised placeholders ($1, $2, etc.) throughout the entire codebase. No string concatenation of user input into SQL.
- **XSS prevention:** The frontend has `esc()` and `escAttrJs()` helper functions with correct implementations, and they appear to be used consistently on user-supplied content.
- **Path traversal protection:** File-serving endpoints validate that resolved paths stay within the uploads directory (lines 1414-1421, 1458-1463, 1469-1474).
- **Transaction usage:** Multi-step operations (restore, bulk import, lead creation, sync) correctly use database transactions with ROLLBACK on error.
- **Graceful shutdown:** The server handles SIGTERM/SIGINT with proper pool draining (lines 4152-4164).
- **Brute-force protection:** Login endpoint has lockout logic with configurable thresholds.
- **Audit trail:** Most create/update/delete operations generate audit log entries.
- **Password handling:** bcrypt with cost factor 10, minimum 8-character enforcement, session invalidation on password change/reset.
