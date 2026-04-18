# Session Log — 2026-04-18 — F-C2 Verification + Continuation

## Session Start

**Loaded:** `docs/HANDOFF.md` (session 5 handoff from b4f818e)
**Starting state:**
- HEAD: `b4f818e` (fix(hub): migrate auth tokens from localStorage to HttpOnly cookie)
- F-C2 committed but NOT browser-verified
- Portfolio dashboard uncommitted in working tree
- PM2 running, 124 tests green
- Model: opus[1m] (1M context window)

**Priority order (from handoff):**
1. Browser-verify F-C2 login/logout/refresh against worksage.nbi-consulting.com
2. Browser-verify portfolio dashboard with Glen
3. Commit portfolio + CLAUDE.md + settings.local.json based on Glen's decisions
4. Resume remaining backlog (B-B5, B-B10, B-B16, B-B25, N-B1)

---

## Log

### F-C2 Browser Verification — COMPLETE, ALL PASS

Verified via agent-browser (v0.26.0) using Glen's Default Chrome profile against `worksage.nbi-consulting.com`.

| # | Check | Result |
|---|-------|--------|
| 1 | Page shows login (no stale localStorage session) | PASS — login form displayed, `nbi_auth_token` not in localStorage |
| 2 | Login works | PASS — POST /api/auth/login returned 200 (username: glen) |
| 3 | Dashboard loads after login | PASS — login overlay hidden, dashboard rendered |
| 4 | No `nbi_auth_token` in localStorage after login | PASS — null |
| 5 | `nbi_session` cookie present and HttpOnly | PASS — `document.cookie` empty (expected for HttpOnly), `/api/auth/me` returns 200 with `credentials: 'include'` |
| 6 | Refresh page stays logged in | PASS — page reload preserves session, no localStorage token used |
| 7 | Logout clears cookie + redirects to login | PASS — login form shown, `/api/auth/me` returns 401 |

Note: First login attempt failed (401) due to wrong password (case-sensitive). Correct password is lowercase.

Note: Chrome Default profile had stale `nbi_auth_token` in localStorage from a pre-migration session. This is expected (old values persist until cleared). After clearing and re-logging with the new code, no new localStorage write occurred — confirming the migration removed all write paths.

### Backlog triage — items already fixed

Cross-referenced the audit against git history. Found many items already resolved:
- N-C6: pino redact already in place (index.ts:22-38)
- B-B2: isAdmin already fixed (server.js:1017)
- B-B6: timing-safe token check already in place (server.js:970-977)
- F-B1/F-B2: localStorage auth refs all removed as part of F-C2

### B-B25 — /metrics localhost check uses req.ip (spoofable via XFF)

**Fix:** Changed `req.ip || req.connection.remoteAddress` to `req.socket.remoteAddress` at server.js:665. Raw TCP peer address can't be spoofed via X-Forwarded-For.

### B-B10 — Settings PUT accepts any key name, no allow-list

**Fix:** Added `SETTINGS_ALLOW_LIST` Set at server.js:5062 with 10 recognised keys (page_permissions, expense_approver, fx_rates, theme, dashboard_layout, notification_preferences, hourly_rate, working_hours_per_week, currency, company_name). PUT with an unrecognised key now returns 400. Prevents arbitrary key injection via the settings table. Verified frontend only writes `fx_rates` and `page_permissions`.

### B-B16 — Legacy PUT /api/sync/tasks destructive full-replace still live

**Fix:** Removed the entire `PUT /api/sync/tasks` handler (~90 lines) from server.js. Verified no frontend callers exist (grep for `sync/tasks` in HTML returned 0 hits). The incremental `POST /api/sync/changes` replaced this long ago. Left a comment explaining the intentional removal so git blame is clear.

### B-B5 — trust proxy XFF spoofing bypasses rate limiter

**Fix:** Two changes in the rate limiter keyGenerator at server.js:574-580:
1. Added cookie token check (`getCookieToken(req)`) as second priority after Bearer header — without this, all F-C2 cookie-auth requests fell through to IP-based limiting, making per-user rate limits ineffective.
2. IP fallback now uses `cf-connecting-ip` (Cloudflare's unspoofable client IP header) with `req.socket.remoteAddress` as final fallback. Removed `ipKeyGenerator(req)` which relied on trust-proxy / X-Forwarded-For and was spoofable.

### B-B1 — public-report regex over-permissive in requireAuth

**Fix:** Tightened regex in requireAuth at server.js:801 from `[^/]+` (any non-slash chars) to `[0-9a-f]{32}` (exact 32-hex-char share token shape). Share tokens are generated via `crypto.randomBytes(16).toString('hex')` = 32 hex chars. Prevents unintended auth bypass on non-token paths under `/api/reports/`.

### B-B8 — audit log ::text = ::text join defeats UUID index

**Fix:** Changed `tk.id::text = al.entity_id::text` to `tk.id = al.entity_id::uuid` at server.js:7917. Casting the text column to UUID lets Postgres use the btree index on `tasks.id` instead of forcing a sequential scan on both sides.

### B-B7 — client-report share tokens have no revoke endpoint

**Fix:** Added `DELETE /api/reports/:id/revoke` endpoint after the list endpoint at server.js:7474. Admin-only, deletes the `client_reports` row by ID which immediately invalidates the share token. Returns 404 if not found.

### F-B9 — finance SAFEGUARD log says "BLOCKED" but still saves

**Fix:** Changed `console.error('[Finance] BLOCKED corrupt save...')` to `console.warn('[Finance] Repaired corrupt save...')` at nbi_project_dashboard.html:9901. The code actually restores missing keys from defaults then saves — the log was misleading. Repair-and-save is the correct behaviour (better than losing non-missing key data).

### F-B3 — parseFloat without NaN guards on finance/expense totals

**Fix:** Added `|| 0` guards to all unguarded `parseFloat()` calls across nbi_project_dashboard.html:
- Line 10138: `expenses.reduce` total — would produce NaN on undefined amount
- Lines 10247, 10425, 10258, 10447: `exp.amount` display in expense tables/cards
- Lines 10248, 10426: `exp.vat_amount` display
- Lines 11454, 11468: `e.amount.toLocaleString()` in finance opex view
- Line 17510: `e.hours` in time log display
All now safely fall back to 0 on bad data instead of showing "NaN".

### Tests — 124/124 passing after all server fixes

Ran `npm test` — all 19 test files, 124 tests green. No regressions from B-B25, B-B10, B-B16, B-B5, B-B1, B-B8, B-B7 fixes.

### N-B1 — double env loading in news sidecar

**Fix:** Two changes:
1. Removed `--env-file=.env` from `ecosystem.config.cjs` node_args — Node's built-in parser conflicts with dotenv's.
2. Removed `import 'dotenv/config'` from `src/index.ts` — redundant with `dotenv.config({ override: true })` on the next line. Now there's exactly one env-loading path: `dotenv.config({ override: true })`, which handles PM2 dump artifacts correctly.

### F-B5 — native alert() for "not yet available" placeholder

**Fix:** Changed `alert('Monthly essay deep-link coming in Task 32.2')` to `toast('Monthly essay deep-link coming soon','info')` at nbi_project_dashboard.html:18813. Uses the themed toast system instead of blocking native dialog.

### B-B18 — PDFs served with inline disposition

**Fix:** Removed `.pdf` from the `safeInline` array at server.js:2505. PDFs are now force-downloaded via `Content-Disposition: attachment` instead of rendering inline, which prevents PDF-based content injection in the browser.

### B-B21 — expense_ids used in IN (...) without UUID validation

**Fix:** Added `expense_ids.some(id => !isValidUuid(id))` guard at server.js:7208 in `POST /api/expense-reports/:id/expenses`. Returns 400 if any ID fails UUID validation. Prevents Postgres 500 on malformed input.

### F-B12 — _cachedTeamMembers.forEach without null guard

**Fix:** Changed both `_cachedTeamMembers.forEach(` calls to `(_cachedTeamMembers || []).forEach(` in nbi_project_dashboard.html. Prevents TypeError if assignee dropdown renders before the async team-member fetch completes.

### Items checked and skipped (already fixed or not actionable)
- F-B18 (escAttrJs `"` escaping): Already fixed — line 3620 escapes `"` to `&quot;`
- F-B8 (board drop bypasses sync): PATCH + refetch is correct behaviour, not a bug
- B-B22 (notification fan-out errors): Already logged via `log('warn')`, minor gap
- F-B7 (polling double-up): Already handled by `restartPollingIntervals()` clear-then-recreate
- F-B4 (browser prompt): Needs themed modal, larger UI change, deferred

