# Handoff — WorkSage audit-fix sprint (2026-04-18)

**Session:** code-reviewed WorkSage end-to-end and landed 9 security-critical fixes. Four critical items remain; each needs a focused session rather than a hurried end-of-sprint touch. Glen is frustrated with pace and expects this handoff to be usable without context from the previous chat.

**Status:** WorkSage is running, verified clean across every tab, no regressions. Session-ending context is tight — start a fresh chat and paste the prompt at the bottom of this doc.

---

## 1. What Glen actually cares about (vocabulary reset)

"NBI Hub" in Glen's language = **WorkSage** = `https://worksage.nbi-consulting.com`. Concretely:

- Frontend: `nbi_project_dashboard.html` (single-page HTML, ~18.5k lines, inline CSS + JS)
- Backend: `dashboard-server/server.js` (Express + PostgreSQL, ~8.3k lines)
- DB: `nbi_dashboard` on PostgreSQL 16 (localhost:5432, user `nbiai`)
- Process: PM2 app `nbi-dashboard` on port 8888 (cluster mode, instances: 1)
- Public via: `cloudflared tunnel run` → `worksage.nbi-consulting.com` → `localhost:8888`
- News sidecar: `projects/news-aggregator/` (PM2 app `nbi-news` on `127.0.0.1:8890`, proxied from `/api/news/*`)

**"NBI Hub" in the older 2026-04-17 handoff = `projects/nbiai_app/`**. That was a separate scaffolded Fastify + React app inspired by Paperclip. Glen's own words this session: *"I don't really give a shit about the paperclip stuff. I only care about WorkSage, which I'm calling the NBI Hub."* `nbiai_app` has been moved to `_archive/nbiai_app/` (commit `275451a` — `chore: archive projects/nbiai_app to _archive/`) and its PM2 process (`nbiai-api`) has been deleted. Do not spend time on the audit-fix sprint for nbiai_app — that codebase is dead weight. See `memory/project_nbi_hub_vocabulary.md` for the full vocabulary note.

---

## 2. Verbatim ask from Glen this session

> "yeah, fix him, just don't fuck up the board."

"Fix him" = fix the critical-findings list. "The board" = the NBI Portfolio kanban at worksage (Workload / Projects / People / Leads / Hiring / Finances / Expenses / Bug Tracker / Settings tabs). Glen uses this daily. Regressions here are the fastest way to earn his wrath.

Glen's hard rules (from memory + this session):

- **British English, no em-dashes, no emojis.** Commit messages follow this.
- **Verify in a real browser against `worksage.nbi-consulting.com`, not curl.** See `memory/feedback_dashboard_verification.md` — today's previous chat got slapped twice for claiming "fixed" on a curl 200 without opening the site.
- **After every fix, walk the affected feature + the home tab.** Glen reviews finished products only; no phase gates.
- **No scope-watering.** If a fix needs to be bigger, make it bigger; don't cut corners.

---

## 3. What's already done (this session, 9 commits on master)

Run `git log --oneline 8a31b48~1..HEAD` to see the full diff.

| SHA | Finding refs | Summary |
|---|---|---|
| `275451a` | archive | `chore: archive projects/nbiai_app to _archive/` — moves the Paperclip-derived codebase out of active rotation. PM2 `nbiai-api` stopped + deleted. |
| `8a31b48` | F-C6, B-B2, F-C5 | `showToast` alias (12 ReferenceErrors); news-proxy `isAdmin` now `role === 'admin'` (I'd introduced this bug earlier in `eff2e89`); renamed shadowed `generateClientReport` to `generateClientReportPDF`. |
| `9360ce1` | F-C1, F-B19, F-B6 | `safeUrl()` helper added near `esc()` (line ~3528). Replaces `esc()` in href contexts for 7 call sites (source_url, brief.website, brief.linkedinCompany, c.linkedin, lead.client_website, lead.client_linkedin, onboarding link.value, attachment f.link_url, news a.url). Blocks `javascript:`, `data:`, `vbscript:`, mixed case, leading whitespace. Allowed: http, https, mailto, tel, `#frag`, `/path`, `//host/...`. Also folded in `rel="noopener noreferrer"` on the three target="_blank" links missing it. |
| `6aa9136` | B-C4, B-C5, B-C6 | Scoped `/api/sync/changes`, `/api/sync/poll`, `/api/sync/load` by `getClientScopes`. Admins unrestricted (Glen sees no change). External (G5) users never see null-client tasks. Internal-with-team users include null-client tasks. Added `EXTERNAL_SETTINGS_ALLOW` whitelist on `/api/sync/load` so G5 users don't get `fx_rates`/`expense_approver`. Fixed the operator-precedence bug on line 4793 (was `A && B || C`, now explicit branch). Write path (`/api/sync/changes`) now rejects out-of-scope upserts, out-of-scope deletes, and non-admin client auto-creation; response includes `rejectedOutOfScope` count. |
| `78ca0ec` | B-B20 | Removed the `fs.readdirSync(uploadsDir).filter(f => f.includes('REDACTED'))` block from `/api/expense-reports/:id/export`. Every export used to ship every employee's redacted bank statements. Feature-off until a per-user `bank_statements` association exists. |
| `d76c6f8` | N-C1, N-C3, N-C6, B-B6 | News sidecar now requires `x-nbi-internal-token` via onRequest hook (timingSafeEqual, `/health` exempt). Outbound calls to the Dashboard now send `DASHBOARD_NOTIFICATION_TOKEN` (was sending the inbound secret). pino logger redacts Authorization / internal token / apiKey / ANTHROPIC_* keys. Dashboard `/api/internal/notifications` validates against `DASHBOARD_NOTIFICATION_TOKEN` with timingSafeEqual + refuses empty strings. Added `DASHBOARD_NOTIFICATION_TOKEN` to `dashboard-server/.env` (backup at `dashboard-server/.env.bak-20260418`). |
| `49fee40` | N-C4, N-C5 | `AbortController` per-stage timeouts in `runApiCall` (clustering 12 min, monthly_synthesis 6 min, everything else 90 s). Replaced `failoverLatched` boolean with timestamped 6-hour cooldown (`failoverLatchedUntil`, `isFailoverLatched()`, `latchFailover()`); the latch auto-resets on cooldown expiry. |
| `bb6aef5` | F-C4, F-C8, B-C3, B-B11 | Client-report popup rewritten with DOM APIs + `window.opener = null` (no more `document.write` with `${clientName}` in title). Client `canReview` now reads `settings.expense_approver` not `username === 'tom'`. `reviewed_by`/`reviewed_at` dropped from admin/reviewer PATCH allow-lists — always server-stamped. `getExpenseApprover` returns null (not 'tom') when unconfigured; caller falls back to broadcasting to all admins. |
| `15522a5` | N-C2 | New `projects/news-aggregator/src/utils/uuids.ts` with `isUuid(s)` and `filterUuids(ids, ctx)`. Applied to `clustering.ts`, `summarisation.ts`, `pipeline/weekly.ts` before building Postgres uuid[] array literals. |
| `dec1652` | F-C3 | News monthly essay no longer round-trips HTML through `data-full` attribute and `innerHTML`. Stores escaped markdown source as `data-md`, decodes and re-renders via `newsMarkdownLite` at toggle time. |

---

## 4. What's still open — critical first

### 4a. NOT CODE — Glen's manual work: credential rotation (audit ref **B-C1**)

`dashboard-server/.env` currently contains live secrets inside an OneDrive-synced path:

- Postgres password for user `nbiai`
- Azure `CLIENT_SECRET` for the `nbihub@nbi-consulting.com` Graph API identity
- `NEWS_INTERNAL_TOKEN`
- `DASHBOARD_NOTIFICATION_TOKEN` (newly-added this session — value matches `projects/news-aggregator/.env`)

Anyone who can read the OneDrive account or a laptop backup has a working Graph-API-sends-as-NBI secret. Rotate **all four**. Steps:

1. **Azure:** Azure portal → App registrations → the NBI app → Certificates & secrets → create new client secret → delete old. Update `AZURE_CLIENT_SECRET` in `dashboard-server/.env`.
2. **Postgres:** `ALTER USER nbiai WITH PASSWORD '<new>';` then update `DATABASE_URL` in both `dashboard-server/.env` and `projects/news-aggregator/.env` (where `NEWS_DB_URL` references the same DB).
3. **Internal tokens:** generate two new 64-char hex values (`openssl rand -hex 32`), set `NEWS_INTERNAL_TOKEN` + `DASHBOARD_NOTIFICATION_TOKEN` identically in both `.env` files (they must match across the two processes for each direction of the RPC).
4. **Move off OneDrive:** `mv dashboard-server/.env C:\Users\gpbea\secrets\worksage.env` and update PM2's `ecosystem.config.js` with `node_args: ['--env-file', 'C:\\Users\\gpbea\\secrets\\worksage.env']` (or equivalent). Same for news-aggregator.
5. `pm2 restart nbi-dashboard nbi-news`.

Leave `.env.example` with placeholder keys so the shape is discoverable. Do not `git add` any real secret.

### 4b. Code, needs a focused session: session cookie port (audit ref **F-C2**)

Move the Dashboard's bearer token from `localStorage.nbi_auth_token` to an `HttpOnly; Secure; SameSite=Lax` cookie set by the server on login. The same pattern I landed on `nbiai_app` in commit `d6555e9` (now in `_archive/`) — that commit is a usable blueprint, but Dashboard's auth is hand-rolled sessions (not Fastify + JWT), so the port is non-trivial. Scope touches every `authFetch` call, the login form, the 401 redirect handler, and the `change-password` flow. High risk of locking Glen out if shipped wrong — **verify login + reload + logout in the browser after every edit**.

Rough plan:

1. `dashboard-server/server.js`: `POST /api/auth/login` — after creating the session, `res.cookie('nbi_session', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 7*24*3600*1000 })`. Response body drops the `token`.
2. `requireAuth` middleware: read from `req.cookies.nbi_session` OR `Authorization: Bearer` header (keep both during rollout).
3. `nbi_project_dashboard.html`: `authFetch` drops the `Authorization` header and adds `credentials: 'include'`. `_authToken` is no longer persisted to localStorage. Remove the `localStorage.setItem('nbi_auth_token', ...)` on login. Keep a short module-level variable only for in-flight use.
4. `logout`: `res.clearCookie('nbi_session', { path: '/' })`.
5. Verify on worksage: login, reload (should stay logged in via cookie), logout (should redirect to login), re-login.

### 4c. Code, needs UX design: finance conflict UI (audit ref **F-C7**)

`nbi_project_dashboard.html:9617-9636` — on a 409 from `/api/finance/save` the current handler calls `showToast` (now wired) then `loadFinanceFromDB()`, which drops the user's in-flight edits with no conflict modal. Reuse the existing `#conflictModal` + `showConflict` pattern from tasks (see `nbi_project_dashboard.html:~16969-16986` for the diff rendering). Needs per-row diff UI for finance items; not a reflex fix.

### 4d. Code, mechanical but long: /api/restore per-row validation (audit ref **B-C2**)

`dashboard-server/server.js:1442-1453` — `/api/restore` upserts arbitrary rows into `clients`, `tasks`, `leads`, `users`, `sows`, `candidates`, `settings` from request body with no per-row schema check. One bad admin POST corrupts everything.

Fix is ~200 lines of Zod schemas (one per restorable table) plus an allow-list of which tables can be restored. Consider a dry-run mode that returns a diff first. Bundle with **B-B10** (settings PUT allow-list) and **B-B15** (bulk-tasks validation) — all three are the same "validate the damn request body" theme.

### 4e. Everything else

Full list in [projects/nbi_dashboard/deliverables/worksage_audit_2026-04-18.md](projects/nbi_dashboard/deliverables/worksage_audit_2026-04-18.md) — Bads (~60) and Needs Review (~47). High-value Bads the next session should look at:

- **B-B3** — `auth/me` + `requireAuth` don't check `is_active`; disabled users work for 7 days.
- **B-B4** — `change-password` doesn't invalidate other sessions or `_tokenCache`. Same-origin fix as B-B3.
- **B-B5** — `trust proxy: 1` + XFF spoofing bypasses IP rate limits on `/api/auth/login` and `/api/auth/forgot-password`.
- **B-B13** — `/api/leads/pipeline/summary`, `/forecast`, `/reminders`, `/dashboard/summary` ignore client scope. G5 users see aggregate pipeline revenue.
- **B-B16** — legacy `PUT /api/sync/tasks` is a destructive full-replace with admin gate; delete it or rename behind a confirmation token.
- **B-B19** — receipt OCR falls back to `api.ocr.space` demo key `'helloworld'`; sends employee PII to a free third-party endpoint.
- **B-B25** — `/metrics` localhost check uses `req.ip` with `trust proxy: 1`; spoofable.

---

## 5. Environment / running state at handoff

```
PM2:
  nbi-dashboard  (cluster, 1 instance)  port 8888
  nbi-news       (fork)                 127.0.0.1:8890
  (nbiai-api was deleted this session — don't resurrect)

Cloudflared:
  tunnel ID:   2d70956e-f293-44e0-b333-a3a7482ab253
  config:      ~/.cloudflared/config.yml
  ingress:     worksage.nbi-consulting.com → http://localhost:8888
  process:     running as PID from `tasklist | grep cloudflared`

PostgreSQL:
  host:        localhost:5432
  service:     "postgresql-x64-16" (Windows service)
  Dashboard DB: nbi_dashboard (owner: nbiai)
  News DB:      same cluster, news.* schema inside nbi_dashboard

Working tree:
  repo:         D:/OneDrive/Claude_code/NBIAI_TEAM
  branch:       master
  remote:       none configured (local-only repo)
  HEAD:         dec1652

.env files (all gitignored, still inside OneDrive — see 4a):
  dashboard-server/.env
  dashboard-server/.env.bak-20260418    ← backup taken this session before edits
  projects/news-aggregator/.env
```

**Glen's DB account for browser-based testing:** `glen@nbi.gg` / `NbiGlen2026!Board` on the nbiai_app box (now archived; unused). On the Dashboard, Glen's account is whatever he logged in with — `nbi_auth_token` in localStorage is the active session. Don't rotate his password without warning him.

---

## 6. Verification protocol to repeat after every fix

Per `memory/feedback_dashboard_verification.md`, every Dashboard-visible change must be verified by:

1. Make the edit.
2. `pm2 restart nbi-dashboard` (and `nbi-news` if you changed news-aggregator after a `cd projects/news-aggregator && npm run build`).
3. Open `https://worksage.nbi-consulting.com` in Chrome via the claude-in-chrome MCP. If the page was already open, do a **hard** cache-bust: `location.href = location.pathname + '?_=' + Date.now() + location.hash` — plain `location.reload()` occasionally serves the cached HTML after big edits.
4. Exercise the feature that was supposed to be fixed (click through, don't just land on a route).
5. `read_console_messages` with `onlyErrors: true`.
6. `read_network_requests` with `filter: 'failed'` — it doesn't actually filter reliably, so skim for non-2xx.
7. For styling fixes, sample computed styles via `javascript_tool`.

Hook reminder showed 11 times this session because I was sloppy with TodoWrite updates. Don't ignore the hook — when you toggle an item, write the list.

---

## 7. Files modified this session (reference for spot-checking)

Frontend (`nbi_project_dashboard.html`):
- `toast` definition area (~3206) — added `const showToast = toast;`
- `esc` / `escAttrJs` area (~3528) — added `safeUrl()` helper
- 3592, 3659, 3696, 13113, 13114, 15054, 15805, 18304 — `esc()` → `safeUrl()` on hrefs
- 10183 — `canReview` no longer checks `username === 'tom'`
- ~16944-17003 — client report popup rewritten with DOM APIs
- 18383-18395, 18415-18434 — monthly essay flow uses `data-md` + re-render at toggle

Backend (`dashboard-server/server.js`):
- 941-963 — `/api/internal/notifications` uses `DASHBOARD_NOTIFICATION_TOKEN` + timingSafeEqual
- 981 — news-proxy `isAdmin: req.user.role === 'admin'`
- 1134-1146 — `getExpenseApprover` returns null instead of 'tom'
- 4236-4547 — `/api/sync/changes` write-path scope gate + rejectedOutOfScope count
- 4554-4610 — `/api/sync/poll` scoped by getClientScopes
- 4740-4824 — `/api/sync/load` settings allow-list + precedence fix
- 5769-5782 — expense PATCH drops `reviewed_by`/`reviewed_at` from allow-list
- 6968-6978 — expense-report PATCH drops same
- 7045-7079 — approver null-fallback broadcasts to admins
- 7238 — expense export no longer ships REDACTED bank statements

News (`projects/news-aggregator/`):
- `src/index.ts` — onRequest auth hook + pino redact
- `src/notifications/hub.ts` — outbound uses `DASHBOARD_NOTIFICATION_TOKEN`
- `src/llm/client.ts` — per-stage timeouts, failover cooldown
- `src/llm/clustering.ts`, `src/llm/summarisation.ts`, `src/pipeline/weekly.ts` — `filterUuids` applied
- `src/utils/uuids.ts` — new file, shared helper

Secrets:
- `dashboard-server/.env` — added `DASHBOARD_NOTIFICATION_TOKEN` (mirrored from news-aggregator)
- `dashboard-server/.env.bak-20260418` — backup of pre-edit state

Archive:
- `_archive/nbiai_app/` — the entire previous audit target moved here

Deliverable:
- `projects/nbi_dashboard/deliverables/worksage_audit_2026-04-18.md` — full audit report (authoritative source of remaining findings)

Memory updates (all in `C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\`):
- `feedback_dashboard_verification.md` — new, the worksage-not-curl rule
- `project_nbi_hub_vocabulary.md` — new, NBI Hub = WorkSage (not nbiai_app)
- `MEMORY.md` — index updated for both

---

## 8. Start-up prompt for the receiving session (paste verbatim)

> Read `projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_worksage_audit_sprint.md` in full before doing anything. You are continuing the WorkSage (aka NBI Hub) audit-fix sprint. 9 critical-fix commits landed on master (HEAD = dec1652). The full remaining-findings list lives in `projects/nbi_dashboard/deliverables/worksage_audit_2026-04-18.md`. Do not touch `_archive/nbiai_app/` — that's dead Paperclip-derived code Glen doesn't want.
>
> Four critical items remain:
> 1. **B-C1 credential rotation** — Glen's manual work, do NOT do this in code; remind him when relevant.
> 2. **F-C2 session cookie port** — high-risk, needs focused session with browser-based login verification after every edit.
> 3. **F-C7 finance conflict UI** — UX design work, not a reflex fix.
> 4. **B-C2 /api/restore validation** — mechanical but ~200 lines of Zod schemas.
>
> Ask Glen which of the four he wants next, or whether he wants to go back to the Bad-tier list (handoff section 4e for high-value picks). Every Dashboard-visible change is verified via Chrome against `worksage.nbi-consulting.com` (not curl, not localhost) — see `memory/feedback_dashboard_verification.md`. Confirm you've read the handoff before proceeding.

---

End of handoff.
