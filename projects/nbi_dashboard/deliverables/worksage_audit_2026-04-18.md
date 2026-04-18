# WorkSage code review — 2026-04-18

**Scope:** `nbi_project_dashboard.html` (frontend SPA), `dashboard-server/` (Express + Postgres backend), `projects/news-aggregator/` (news sidecar).

**Method:** Three parallel audit passes (one per surface) performed by sub-agents, each briefed on the same format used in the 2026-04-17 nbiai_app audit. The main session (this document) spot-checked the most severe findings against real source before consolidating.

**Spot-checks personally verified by the main session** (not fabricated, grounded in source):

- `dashboard-server/server.js:981` — news-proxy `isAdmin` bug (always false).
- `dashboard-server/server.js:4236` — `/api/sync/changes` writes without client scope.
- `dashboard-server/server.js:4554` — `/api/sync/poll` leaks every task to any auth'd user.
- `dashboard-server/server.js:4793` — operator-precedence bug in sync/load scope filter (`|| !r.client_id`).
- `dashboard-server/server.js:7144` — expense-report export ships every REDACTED bank-statement PDF in the uploads dir.
- `nbi_project_dashboard.html:10151` — `_currentUser.username === 'tom'` hardcoded for expense review.
- `nbi_project_dashboard.html:15735 + 16892` — duplicate `generateClientReport` declarations (the async/PDF one is shadowed and unreachable).
- `nbi_project_dashboard.html:16945` — `win.document.write` with `${clientName}` in `<title>`.
- `nbi_project_dashboard.html:showToast` — 12 call sites, zero declarations (verified with Grep).
- `projects/news-aggregator/src/index.ts:22-24` + `routes/media.ts`, `routes/digests.ts` — no preHandler/onRequest/auth on `/news/*`.
- `projects/news-aggregator/src/notifications/hub.ts:11` — sends `NEWS_INTERNAL_TOKEN` (inbound secret) as the outbound header; `DASHBOARD_NOTIFICATION_TOKEN` declared in config but unused.

Everything else in this document is an agent-reported finding that should be re-verified against source before you ship a fix for it. Line numbers and severity are the agents' claims, not independently confirmed.

**Totals reported by agents** (claims, not measurements):

| Surface | Critically Bad | Bad | Needs Review | Good |
|---|---:|---:|---:|---:|
| Frontend (nbi_project_dashboard.html) | 8 | 22 | 19 | 14 |
| Backend (dashboard-server/) | 6 | 27 | 18 | 12 |
| News sidecar (projects/news-aggregator/) | 6 | 15 | 10 | 9 |

---

## Critically Bad — start here

These are security, data-integrity, or silent-failure bugs. Numbered per surface (F = frontend, B = backend, N = news). Cite the line range shown when fixing; re-verify in source first.

### F-C1. `javascript:` URLs are not blocked in href-rendered links
**Location:** `nbi_project_dashboard.html:3586, 3653, 3690, 13107, 13108, 18292`
**Finding:** `esc()` performs HTML entity encoding only; it does not validate URL schemes. Fields like `brief.website`, `brief.linkedinCompany`, `c.linkedin`, `lead.client_website`, `lead.client_linkedin`, `n.source_url`, `a.url` are written straight into `<a href="${esc(...)}">`. A record containing `javascript:alert(document.cookie)` fires on user click.
**Impact:** Any authenticated user who can edit a URL field can mint a persistent stored-XSS payload. The token in `localStorage` is then exfiltratable by anyone who clicks the link.
**Fix:** Add a URL sanitiser that allows only `http`, `https`, `mailto`, `tel`; apply uniformly to every user-controlled href.

### F-C2. Auth token in `localStorage`
**Location:** `nbi_project_dashboard.html:2303, 2496, 7528, 12537`
**Finding:** Session bearer token is stored in `localStorage` under `nbi_auth_token` and read by both `authFetch` and raw-`fetch` file-upload paths. Any XSS steals it.
**Impact:** Stolen token = full API access for the session's lifetime, persists across tabs.
**Fix:** Move the session to an HttpOnly, Secure, SameSite=Lax cookie set by the backend on login. (Same fix that was done for `nbiai_app` today; architectural blueprint available.)

### F-C3. News monthly-synthesis HTML round-tripped through `data-full` → `innerHTML`
**Location:** `nbi_project_dashboard.html:18334, 18360`
**Finding:** `newsMarkdownLite(body)` builds an HTML string, stores it as `data-full="${newsEsc(fullHtml)}"`, and later writes `body.innerHTML = body.getAttribute('data-full')`. Today the "bold/italic" markdown pass applies after `newsEsc` so injected `<script>` can't reach the DOM — but the design has zero defence-in-depth and a single future markdown extension (image/link support) would convert this into persistent XSS.
**Impact:** High blast radius — the attack surface is anyone who writes `monthly_summaries.body_markdown` (currently the LLM).
**Fix:** Store `data-md` (markdown source) not `data-full`; re-run the markdown pass at toggle time into a DocumentFragment.

### F-C4. `document.write` of a new window with client name in `<title>`
**Location:** `nbi_project_dashboard.html:16944-16945`
**Finding:** The CSV-variant `generateClientReport` opens `window.open('', '_blank', ...)` and `document.write`s a template interpolating `${clientName}` inside `<title>`. A client named `</title><script>…</script>` breaks out of the title context. `report.replace(/</g,'&lt;')` guards the body but not the title.
**Impact:** XSS via client name. The popup can reach `window.opener` and execute in the parent origin.
**Fix:** Build popup content via DOM APIs, set `win.document.title = clientName` after escaping, and `win.opener = null` after open.

### F-C5. Two `generateClientReport` functions — the PDF one is dead
**Location:** `nbi_project_dashboard.html:15735` (async, server-backed) and `nbi_project_dashboard.html:16892` (sync, local CSV)
**Finding:** Both are `function` declarations in the same scope. Hoisting makes the second win; every call-site gets the clipboard popup, not the server-audited PDF pipeline.
**Impact:** The Report button silently bypasses the audit trail you probably expect it to hit.
**Fix:** Rename the local one (e.g. `generateClientReportCSV`); route call-sites explicitly. Decide which is canonical and delete the other.

### F-C6. `showToast` is called from 12 sites and never defined
**Location:** `nbi_project_dashboard.html:9628, 9631, 9634, 15609, 15618, 15625, 15628, 15858, 15865, 15875, 15954, 15964` (verified by Grep — zero declarations exist)
**Finding:** Everywhere else uses `toast(...)`; these twelve sites call the non-existent `showToast(...)` and throw `ReferenceError` at runtime. Affects finance conflict handling, system broadcast, attachment confirm/move/download.
**Impact:** Silent breakage in high-value paths. Finance 409 conflict flow at 9628–9629 never reaches the `loadFinanceFromDB()` reload because the throw precedes it.
**Fix:** Trivial — `const showToast = toast;` near the `toast` definition, or rename all 12 to `toast`. Then grep for other ghost names.

### F-C7. Finance save silently abandons `expectedVersion` on 409
**Location:** `nbi_project_dashboard.html:9617-9636`
**Finding:** 409 handler calls `showToast` (F-C6: throws) and would call `loadFinanceFromDB()`, which drops the user's in-flight edits with no conflict UI. 5xx in the outer try is not retried; debounce timer is cleared on entry, so a transient failure loses the change even while localStorage reports "saved".
**Impact:** Silent data loss on concurrent finance edits or server hiccups; surfaces at month-end.
**Fix:** Surface a proper conflict modal (reuse `#conflictModal`), retain pending edits until resolved, retry transient network failures with the stored `expectedVersion`.

### F-C8. Role check by username literal
**Location:** `nbi_project_dashboard.html:10151` (verified)
**Finding:** `const canReview = isAdmin || (_currentUser && _currentUser.username === 'tom');` — gating expense-report approve/reject on a username string.
**Impact:** Anyone created with username `tom` gets approve/reject UI. Server-side must also re-enforce (audit backend B11 for related hardcoded fallback).
**Fix:** Introduce a proper `expense_approver` boolean on the user record; read that here. Never gate UI on username literals.

### B-C1. Live Azure / DB / internal secrets in `dashboard-server/.env` inside OneDrive
**Location:** `dashboard-server/.env:4-21`
**Finding:** Real Postgres password (`NbiAi2026!SecureDb`), Azure client secret (`e3x8Q~lM6USsE4z9ZCnNTSe1QzXOoBZzhyrKsb5e`), and `NEWS_INTERNAL_TOKEN` sit in `.env`. `.env` is gitignored, but the working tree is inside an OneDrive-synced path. Anyone who can read the OneDrive account or a machine backup has a working Graph API client secret that sends mail as `nbihub@nbi-consulting.com` and reads its mailbox.
**Impact:** Full compromise of the NBI email identity and DB if OneDrive sync, a backup, or the laptop leaks.
**Fix:** Rotate the Azure secret and Postgres password. Move secrets out of OneDrive — Windows DPAPI, Azure Key Vault, or at minimum `C:\Users\gpbea\secrets\worksage.env` outside OneDrive, with the server reading from there.

### B-C2. `/api/restore` upserts arbitrary rows into core tables with no per-row validation
**Location:** `dashboard-server/server.js:1442-1453`
**Finding:** Only gated by `req.user.role !== 'admin'`. No UUID/length/enum/FK checks per row. Also mutates `settings` via upsert — an admin session can overwrite `expense_approver` or `fx_rates` through this path without going through the settings endpoints. 10 MB JSON cap is the only size control.
**Impact:** A single malformed backup POST permanently corrupts every restored table in one transaction.
**Fix:** Per-table Zod schemas; allow-list tables; require dry-run-returning-diff as a first step before apply.

### B-C3. Admin PATCH on expenses lets admin forge the audit trail
**Location:** `dashboard-server/server.js:5661-5678`
**Finding:** The admin allow-list includes `status`, `reviewed_by`, and `reviewed_at`. Admins can set `reviewed_by` to any string and backdate `reviewed_at`, defeating the legal audit control on reimbursements.
**Impact:** The expense approval audit trail is forgeable by any admin.
**Fix:** Drop `reviewed_by` and `reviewed_at` from the admin allow-list; always set them server-side when `status` changes.

### B-C4. `POST /api/sync/changes` writes across client scopes (verified)
**Location:** `dashboard-server/server.js:4236-4423`
**Finding:** Only gated by `if (!req.user)`. No `getClientScopes`. The upsert resolves `client_id` from `t.client` name (line 4300-4306) and auto-creates clients (line 4303) via `ON CONFLICT`. A G5 client-scoped user can write into any client's task list and create new clients.
**Impact:** Tenant isolation is broken on the main write path.
**Fix:** Resolve scope once via `getClientScopes`; reject rows whose `clientId` is out of scope; refuse auto-creation of clients by non-admins; refuse `delete` for out-of-scope tasks.

### B-C5. `/api/sync/poll` leaks every task to every auth'd user (verified)
**Location:** `dashboard-server/server.js:4554-4610`
**Finding:** No scope filter. `SELECT t.*, c.name FROM tasks t LEFT JOIN clients c ...` plus a full-DB `currentIds` enumeration. External client users harvest the entire task graph with other clients' names.
**Impact:** Full cross-tenant leak on the incremental-sync path.
**Fix:** Filter `tasks` and `currentIds` by `getClientScopes`. Same filter applied to `/api/sync/load`.

### B-C6. `/api/sync/load` returns all `settings`, and the task-scope filter has an operator-precedence bug (verified)
**Location:** `dashboard-server/server.js:4713-4805` (filter at 4793)
**Finding:** `settings: settingsObj` returns the full settings table unconditionally. The task-scope filter at 4793 is written as `r.client_id && scopeSet.has(r.client_id) || !r.client_id`; JS parses this as `(A && B) || C`, meaning every task with `client_id IS NULL` is exposed to every scoped user.
**Impact:** External client users see every server setting (`fx_rates`, `expense_approver`, etc.) and every null-client task (which includes unassigned internal work).
**Fix:** Settings — strip to an allow-list per user type. Filter — `r.client_id ? scopeSet.has(r.client_id) : false` if nulls should be hidden; or explicit rule per scope.

### N-C1. No inbound auth on `/news/*` (verified)
**Location:** `projects/news-aggregator/src/index.ts:22-24`, `src/routes/digests.ts`, `src/routes/media.ts`
**Finding:** Service registers `healthRoutes`, `mediaRoutes`, `digestRoutes` with no Fastify `preHandler`, `onRequest`, or auth plugin. `NEWS_INTERNAL_TOKEN` is outbound-only (see N-C3); inbound check is the 127.0.0.1 bind and nothing else.
**Impact:** Anything sharing the loopback interface (misconfigured PM2 app, SSH port-forward, future container with `--net=host`, SSRF in another sidecar) reads every digest and media asset. One ecosystem.config edit from exposure.
**Fix:** Add an `app.addHook('onRequest', ...)` that requires `crypto.timingSafeEqual(req.headers['x-nbi-internal-token'], config.NEWS_INTERNAL_TOKEN)` for every request under `/news`. Skip for `/health`.

### N-C2. Cluster article-ID list built as string literal interpolated into raw SQL
**Location:** `projects/news-aggregator/src/llm/clustering.ts:43-48`, `src/llm/summarisation.ts:40-45`, `src/pipeline/weekly.ts:72-77`
**Finding:** `const idArray = \`{${articleIds.join(',')}}\`` then `sql\`... ANY(${idArray}::uuid[])\``. Drizzle treats `${idArray}` as a single string, so `::uuid[]` currently rejects malformed entries — but the ID sources differ. In `summariseStory` the input comes straight from the LLM's `cluster.article_ids` (clustering.ts:64) and is only type-checked by `typeof id === 'string'` (clustering.ts:70). A hostile cluster string crashes the query today; if `::uuid[]` is ever removed it becomes injection.
**Impact:** Today: brittle parse that silently empties a digest stage. Future refactor risk.
**Fix:** Validate every ID with a UUID regex before joining, or switch to Drizzle's `inArray(schema.articles.id, ids)`.

### N-C3. Token confusion — inbound secret sent outbound (verified)
**Location:** `projects/news-aggregator/src/notifications/hub.ts:7-14`, `src/config.ts:7-8`
**Finding:** Outbound calls to the Dashboard send `'x-nbi-internal-token': config.NEWS_INTERNAL_TOKEN`. `DASHBOARD_NOTIFICATION_TOKEN` is declared in config but never used.
**Impact:** The advertised separation (one token in, a different token out) is fake. Token rotation is unsafe — the Dashboard's inbound log would record the news sidecar's inbound secret.
**Fix:** Send `DASHBOARD_NOTIFICATION_TOKEN` instead. Assert at boot that the two tokens differ.

### N-C4. No timeout or abort on Anthropic SDK calls
**Location:** `projects/news-aggregator/src/llm/client.ts:53-59`
**Finding:** `client.messages.stream(...)` awaited via `stream.finalMessage()` with no `signal`, `timeout`, or `maxRetries`. At `max_tokens: 32768` (clustering.ts:60) a wedged stream can hang forever while `generation_runs` stays `running`.
**Impact:** Blocks subsequent runs, never marks failed, never fires the `notifyGenerationFailed` notification.
**Fix:** `AbortController` per stage (clustering ≈ 12 min, summarisation ≈ 90 s). Translate abort into a proper failure that updates `generation_runs.status = 'failed'`.

### N-C5. Failover latch is process-global, never reset
**Location:** `projects/news-aggregator/src/llm/client.ts:8, 81, 103-104`
**Finding:** `failoverLatched` is a module-level boolean. Only reset by `__resetFailoverForTests`. One transient 401 permanently moves the service onto the failover key until a PM2 restart.
**Impact:** Silent migration to the secondary key, wrong cost attribution, potential hard-down if failover has lower rate limits.
**Fix:** Time-box the latch (retry primary after N hours / N calls). Surface state in `/health`. Emit a notification on auto-reset.

### N-C6. No `redact` on the pino logger
**Location:** `projects/news-aggregator/src/index.ts:20`, `src/llm/client.ts:1-18`
**Finding:** Logger started with level-only config. No `redact` for headers or API keys. If the Anthropic SDK ever throws a wrapped error containing `config.headers`, pino serialises it with `Authorization` present.
**Impact:** API-key leakage into PM2 log files.
**Fix:** `redact: ['req.headers.authorization', 'req.headers["x-nbi-internal-token"]', '*.headers.authorization', 'apiKey', 'api_key']`.

---

## Bad — schedule after Criticals

### Frontend (22)

- **F-B1.** `nbi_project_dashboard.html:7528-7533` — attachment upload reads token from localStorage, skips `authFetch`.
- **F-B2.** `nbi_project_dashboard.html:12537-12542` — SoW upload same pattern.
- **F-B3.** `nbi_project_dashboard.html:9832, 9873, 9885, 9941, 10023-10024, 10078` — `parseFloat` without NaN guards on finance totals.
- **F-B4.** `nbi_project_dashboard.html:17343` — browser `prompt()` for template naming (inconsistent with themed modals).
- **F-B5.** `nbi_project_dashboard.html:18464` — native `alert()` for "not yet available" placeholder.
- **F-B6.** `nbi_project_dashboard.html:3586, 3653, 3690` — `target="_blank"` links missing `rel="noopener noreferrer"`.
- **F-B7.** `nbi_project_dashboard.html:2931, 17257, 17279, 17282-17316` — polling intervals double-up after re-login.
- **F-B8.** `nbi_project_dashboard.html:7234` vs `2819` — board-drop uses `PATCH` directly, bypassing sync/conflict detection.
- **F-B9.** `nbi_project_dashboard.html:9592-9599` — finance SAFEGUARD log says "BLOCKED" but still saves.
- **F-B10.** `nbi_project_dashboard.html:2897-2925` — IndexedDB WAL recovery silently skips orphan task IDs.
- **F-B11.** `nbi_project_dashboard.html:4183` — `toggleStandupDone` triggers full `renderContent()`.
- **F-B12.** `nbi_project_dashboard.html:2398, 4331` — `_cachedTeamMembers.forEach` without null guard.
- **F-B13.** `nbi_project_dashboard.html:3767, 3769` — `filterByClient` drops the `sort` field.
- **F-B14.** `nbi_project_dashboard.html:17577-17582` — mobile hamburger monkey-patches `switchView`.
- **F-B15.** `nbi_project_dashboard.html:5716, 5728-5739` — Gantt silently drops above 200 rows, no banner.
- **F-B16.** `nbi_project_dashboard.html:14803-14810, 15007, 13915-13917, 14786` — window globals used as view state.
- **F-B17.** `nbi_project_dashboard.html:3838-3870` vs `3878-3913` — `renderAll()` and `renderContent()` are near-duplicates; drift risk.
- **F-B18.** `nbi_project_dashboard.html:3533-3541` — `escAttrJs` escapes `'` and `\` but not `"`.
- **F-B19.** `nbi_project_dashboard.html:18292-18295` — news source URL rendered through `newsEsc` without scheme validation.
- **F-B20.** `nbi_project_dashboard.html:3003, 3005` — `getRootAncestor`/`getDescendants` have no cycle guard (while `getTaskPractice` does).
- **F-B21.** `nbi_project_dashboard.html:3769, 3800, 3738` — `history.pushState` on every filter change pollutes back-history.
- **F-B22.** `nbi_project_dashboard.html` — ~211 inline `onclick` handlers; latent XSS risk on every missing `escAttrJs`; blocks strict CSP.

### Backend (27)

- **B-B1.** `dashboard-server/server.js:783` — public-report regex `/^\/api\/reports\/[^/]+(\/html|\/pdf)?$/` is over-permissive; tighten to hex token shape.
- **B-B2.** `dashboard-server/server.js:981` — news-proxy sends `isAdmin: !!req.user.is_admin`, but `req.user` has `role`, not `is_admin`. (Verified — introduced by me in `eff2e89` when I didn't look at how `req.user` was shaped.)
- **B-B3.** `dashboard-server/server.js:759-770` and `795-801` — neither `auth/me` nor `requireAuth` check `is_active`; disabled users keep working until session expiry.
- **B-B4.** `dashboard-server/server.js:1022-1036` — `change-password` doesn't invalidate other sessions or the token cache.
- **B-B5.** `dashboard-server/server.js:561-573` — `trust proxy: 1` lets XFF-spoofing bypass IP-based rate limits if Cloudflare doesn't strip XFF.
- **B-B6.** `dashboard-server/server.js:941-963` — `/api/internal/notifications` uses `!==` (timing-variable) and accepts empty-string match if `NEWS_INTERNAL_TOKEN` is unset.
- **B-B7.** `dashboard-server/server.js:7206-7228` — client-report public share tokens have no revoke endpoint.
- **B-B8.** `dashboard-server/server.js:7682` — `::text = ::text` join defeats the `idx_audit_log_entity` UUID index.
- **B-B9.** `dashboard-server/server.js:3934-3948` — dependency cycle-detection CTE runs on every PATCH; no GIN index on `tasks.dependencies`.
- **B-B10.** `dashboard-server/server.js:4834-4843` — settings PUT accepts any key name, no allow-list.
- **B-B11.** `dashboard-server/server.js:1117-1124` — `getExpenseApprover` falls back to hardcoded `'tom'` on DB error.
- **B-B12.** `dashboard-server/server.js:6797-6832` — expense-report view fetches full row before access check.
- **B-B13.** `dashboard-server/server.js:5145-5188, 5127, 4853` — leads/pipeline summary, forecast, reminders, and dashboard summary all ignore client scope.
- **B-B14.** `dashboard-server/server.js:2565-2620` — calendar visibility degrades silently on DB errors.
- **B-B15.** `dashboard-server/server.js:4187-4226` — `POST /api/tasks/bulk` skips validation, `item_type`, and `shiftForInsert` (position-0 collisions).
- **B-B16.** `dashboard-server/server.js:4617-4705` — legacy `PUT /api/sync/tasks` is a destructive full-replace that still works; delete or rename behind a confirmation token.
- **B-B17.** `dashboard-server/server.js:2090-2147` — contract PDFs retained in `uploads/` with no cleanup.
- **B-B18.** `dashboard-server/server.js:2362-2377` — PDFs served with inline disposition; force attachment.
- **B-B19.** `dashboard-server/server.js:5907-5911` — receipt OCR falls back to `api.ocr.space` with the public demo key `helloworld`; sends employee PII to a free third-party endpoint.
- **B-B20.** `dashboard-server/server.js:7143-7147` — expense-report export `fs.readdirSync(uploadsDir).filter(f => f.includes('REDACTED'))` ships every employee's redacted bank statement in every employee's export ZIP. (Verified.)
- **B-B21.** `dashboard-server/server.js:6994-7017` — `expense_ids` used in `IN (...)` without UUID validation; non-UUID → pg 500.
- **B-B22.** `dashboard-server/server.js:4506-4537` — notification fan-out errors silently drop; no count returned.
- **B-B23.** `dashboard-server/server.js:400-405` — `shiftForInsert` is O(N) per insert (`UPDATE ... WHERE status = $1`).
- **B-B24.** `dashboard-server/server.js:1367-1399, 7435-7505, 4713-4721` — several aggregates select every row with no pagination/streaming.
- **B-B25.** `dashboard-server/server.js:654-661` — `/metrics` localhost-only check uses `req.ip` with `trust proxy: 1`; potentially open to remote callers via spoofed XFF.
- **B-B26.** `dashboard-server/server.js` various — inconsistent error envelopes; settle on the v2 `{data, error:{code, message, details}, meta}` shape.
- **B-B27.** `dashboard-server/migrations/004_bug_reports.sql` — no FK from `bug_report_comments.report_id`; delete leaves orphans.

### News sidecar (15)

- **N-B1.** `projects/news-aggregator/ecosystem.config.cjs:8` + `src/index.ts:1-7` — `--env-file=.env` and `dotenv.config({ override: true })` both load env with different parsers; pick one.
- **N-B2.** `projects/news-aggregator/src/llm/curation.ts:53-61` — curation-enriched payload omits article titles; the LLM is picking clusters from entity names alone.
- **N-B3.** `projects/news-aggregator/src/ingest/scheduler.ts:34-53, 91, 100` — hourly ingest never retries failed enrichments; articles can stay without OG images forever.
- **N-B4.** `projects/news-aggregator/src/pipeline/weekly.ts:91-137` — sequential summarisation holds the event loop for minutes; use `pLimit(4)`.
- **N-B5.** `projects/news-aggregator/src/routes/digests.ts:73-97` — N correlated subqueries per story with no caching on the hottest endpoint.
- **N-B6.** `projects/news-aggregator/src/ingest/scheduler.ts:45` — `embeddedVideoUrls` empty-list policy is ambiguous (preserve or overwrite?).
- **N-B7.** `projects/news-aggregator/src/llm/json-utils.ts:18-26` — JSON parser uses `indexOf('{')` to `lastIndexOf('}')`, too greedy.
- **N-B8.** `projects/news-aggregator/src/sources/registry.ts:9-27` + `seed.json` — source list is code; no admin write path.
- **N-B9.** `projects/news-aggregator/src/llm/client.ts:13-15` + `config.ts:9` — `ANTHROPIC_API_KEY` read straight from `process.env`, bypassing the Zod schema; late-fail.
- **N-B10.** `projects/news-aggregator/src/ingest/fetcher.ts:35-49` + `src/ingest/enrichment.ts:90-108` — no retries with backoff; a flaky feed auto-disables within a week.
- **N-B11.** `projects/news-aggregator/src/ingest/feed-health.ts:39-67` — auto-disable threshold has no minimum-sample guard.
- **N-B12.** `projects/news-aggregator/src/media/cache.ts:61-72` — `onConflictDoNothing()` without target; already-downloaded variants still write.
- **N-B13.** `projects/news-aggregator/src/index.ts:23-24` — `prefix: '/news'` duplicated; extract a constant or group register.
- **N-B14.** `projects/news-aggregator/src/llm/clustering.ts:50`, `src/llm/summarisation.ts:53`, `src/llm/monthly-synthesis.ts:59` — `JSON.stringify(rows, null, 2)` pretty-prints tokens sent to the LLM.
- **N-B15.** `projects/news-aggregator/package.json:20` — `@fastify/cors` and `@fastify/static` are installed but unused.

---

## Needs Review — architectural / decide-before-fix

These are judgement calls more than bugs. Don't reflex-fix; discuss first.

### Frontend (19)

- **F-N1.** Magic caps 200 (Gantt) / 50 (board lane) / 20 (cancelled) scattered inline (`nbi_project_dashboard.html:5716, 5180, 5213`).
- **F-N2.** 10-second sync poll hardcoded (`2987, 17314`).
- **F-N3.** Debounce windows 500 ms (sync) vs 800 ms (finance) (`2781, 9637`).
- **F-N4.** `_recentlyEditedIds` 15-second self-echo window (`2753, 2979, 17295`).
- **F-N5.** Hourly rate default `£150` in client bundle (`2665`).
- **F-N6.** `CLIENT_PRIORITY` array in the SPA (`3093`).
- **F-N7.** Hardcoded client abbreviation fallback with a "NBI  OPS" typo (`3028`).
- **F-N8.** 18,489-line single HTML file; strategic refactor decision.
- **F-N9.** `renderTacticalDashboard` 200+ lines (`3955`).
- **F-N10.** `renderNewsView` uses `+` concatenation and a parallel `newsEsc` helper (`18256-18337`).
- **F-N11.** `_tasksInitialCollapse` resets tree expand state on every view switch (`3737, 5008-5016`).
- **F-N12.** `standupSortOrder` skips slot `1` with no comment (`4375`).
- **F-N13.** `LANE_CAP = 50` per lane, 6 lanes = 300 cards total before truncation, undocumented (`5180`).
- **F-N14.** Frankfurter + fallback FX called cross-origin with no SRI/timeout (`9527, 9538`); proxy through backend.
- **F-N15.** `xlsx.full.min.js` loaded from `cdn.sheetjs.com` with SRI; self-host to cut supply-chain risk (`25`).
- **F-N16.** Google Fonts blocking render + IP leak to Google (`26`); self-host Inter/JetBrains Mono.
- **F-N17.** Hiring sort tangled with filter (`14808-14818`).
- **F-N18.** `authFetch` doesn't distinguish 403 from other errors (`2423-2438`).
- **F-N19.** Focus-trap MutationObserver on detail overlay without teardown (`18150-18157`).

### Backend (18)

- **B-N1.** `dashboard-server/ecosystem.config.js:6` — `instances: 1`, no cluster mode; in-memory caches assume single process.
- **B-N2.** `server.js` is 8,336 lines; strategic split by bounded context.
- **B-N3.** No ORM, no request-validation library.
- **B-N4.** No per-route timeouts beyond pool `statement_timeout: 30000` (`143`).
- **B-N5.** `init-db.js:173` seeds all users with password `nbi2026`.
- **B-N6.** Cron jobs run inside the request-handler process; `backup.js` uses `execSync` on `pg_dump`.
- **B-N7.** Graceful shutdown doesn't drain in-flight cron jobs (`8281-8291`).
- **B-N8.** `ALWAYS_VISIBLE_CLIENTS` string-matched on name with double-space typo `'NBI  OPS'` (`811`).
- **B-N9.** `getClientScopes` returns `null` (unrestricted) when a user has no teams — deny-by-default inverted (`832-839`).
- **B-N10.** FX fallback hardcoded `{ USD: 0.79, EUR: 0.86 }` (`5167`).
- **B-N11.** Hand-maintained column allow-lists per handler; one source-of-truth missing.
- **B-N12.** `bug_reports.screenshot` stored as base64 in a TEXT column.
- **B-N13.** Cron schedules have no explicit timezone (UK DST drift risk).
- **B-N14.** CSP allows `'unsafe-inline'` in `script-src` (`545`); tighten.
- **B-N15.** `_failedLogins` in-memory map grows unbounded until hourly cleanup (`709-715, 342`).
- **B-N16.** Auto-created client name in `/sync/changes` has no length/format validation (`4303`).
- **B-N17.** `t.parentId` vs `t.parent_id` naming inconsistency could silently null-out (`4309`).
- **B-N18.** `/api/health` checks DB only; add Graph API + news sidecar deep health (`1311-1320`).

### News sidecar (10)

- **N-N1.** Loopback-only as the entire security model (`src/index.ts:32`).
- **N-N2.** Cron inside the API process (`src/index.ts:35`, `src/scheduler/cron.ts`).
- **N-N3.** Single-instance PM2, no zero-downtime restart (`ecosystem.config.cjs:18-19`).
- **N-N4.** Schema drift risk: `search_vector` in raw SQL migration, not in Drizzle schema (`src/db/schema.ts:98-99, 121`, `migrations/0001_search_vectors.sql`).
- **N-N5.** Prompt versioning has no `created_by` audit trail (`src/db/schema.ts:163-172`, `src/llm/prompts.ts:49-87`).
- **N-N6.** No daily/monthly token budget or kill-switch.
- **N-N7.** LLM model hardcoded (`src/llm/client.ts:10`).
- **N-N8.** `monthly_summaries.month` not unique (`src/db/schema.ts:135-145`, `src/pipeline/monthly.ts:25-33`).
- **N-N9.** `weeklyDigestPeriod` returns wrong window outside cron (`src/utils/dates.ts:72-85`).
- **N-N10.** Boot `healthcheckAuth` writes a real `generation_runs` row (`src/index.ts:38`, `src/llm/client.ts:138-150`).

---

## Good (worth preserving)

### Frontend (14)

`esc()` + `escAttrJs()` convention (3526, 3529-3541); `authFetch` 401→login flow (2423-2438); IndexedDB WAL for crash recovery (2314-2363, 2897-2925); `_softReRender` scroll preservation (4255-4269); conflict modal with per-field diff (2856, 16969-16986); skeleton placeholders; `_trapFocus` / `_releaseFocusTrap` on dynamic modals (3247-3288); keyboard-a11y MutationObserver patches (17656-17679); `addManagedListener` registry (2287-2299); `themedConfirm` promise-based replacement for `confirm()` (3219-3232); `safeColour` validator (11764); cycle-safe `getTaskPractice` (3146-3163); conflict UX diff pattern (16969-16986).

### Backend (12)

SHA-256 session token hashing (505-508, 732-738); `POSITION_TABLES` whitelist to prevent identifier injection (376-388); SoW PDFs held in memory, buffer nulled (3035-3042, 3163-3166); `escHtml` in public client-report renderer (516-519, 7264-7342); optimistic concurrency on finance saves (2849-2860); password-reset tokens hashed + all sessions killed (886-888, 930-934); multer storage with random filenames + type allow-list (117-127); `sanitiseAuditData` before audit writes (1131-1139); backup excludes `users.password_hash` (1372, 1479-1485); OCR + FX circuit breakers (522-523); path-traversal defence (`path.resolve` + `startsWith`) on every file-serving endpoint (2363-2367, 2437, 5699-5701); versioned migration runner with per-migration transactions (migrations/runner.js:31-123).

### News sidecar (9)

Explicit `host: '127.0.0.1'` bind; Zod-validated config with hard exit (`config.ts:14-20`); streaming Anthropic responses (`client.ts:53`); `safeParseJson` code-fence-first (`json-utils.ts:13-16`); curation re-derives `dynamic_category_label` from counts rather than trusting LLM (`curation.ts:79-97`); hero-selection fallback on hallucinated ID (`hero-selection.ts:38-40`); media variants as WebP with `withoutEnlargement` (`variants.ts:22-27`); OG image deduped by SHA-256 with size cap (`cache.ts:44-53`); structured pino logging keyed by slug/outcome/duration.

---

## Suggested fix order (starting point, subject to Glen's call)

1. **Credential hygiene first, today.** Rotate the Azure client secret and Postgres password (B-C1). Move `dashboard-server/.env` out of OneDrive. Won't touch the code; the file move + restart is the whole change.
2. **Stop the cross-tenant leak.** B-C4 + B-C5 + B-C6 together — add `getClientScopes` to `/api/sync/changes`, `/api/sync/poll`, `/api/sync/load`, and fix the precedence bug on line 4793. One commit.
3. **Kill the expense-export bank-statement leak.** B-B20 — every user gets every redacted statement. Trivial fix once a `bank_statements` association exists; short-term, drop the block entirely and rebuild the feature properly.
4. **Kill the 12 `ReferenceError`s.** F-C6 — rename `showToast` → `toast` or add a `const showToast = toast`. One-line fix.
5. **Delete the dead `generateClientReport`.** F-C5 — decide which one is canonical, delete the other.
6. **URL scheme sanitiser** — F-C1 + F-B19 — a `safeUrl()` helper applied to every user-controlled href.
7. **Refresh token cookie for WorkSage.** F-C2 — same pattern as nbiai_app today, port over.
8. **Expense audit trail hardening.** B-C3 (drop `reviewed_by`/`reviewed_at` from admin PATCH) + F-C8 (drop username-`tom` gating client-side) + B-B11 (don't fallback to `tom`).
9. **News inbound token verification.** N-C1 + N-C3 — `onRequest` hook + rotate `DASHBOARD_NOTIFICATION_TOKEN` into outbound.
10. **News LLM timeouts + failover reset.** N-C4 + N-C5.

Everything else — the 64 Bads and 47 Needs Reviews — scheduled after the Criticals land.
