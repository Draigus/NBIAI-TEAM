# Handoff — NBI Hub audit-fix sprint

**Date:** 2026-04-17
**Session start:** full exhaustive code review of NBI Hub (`projects/nbiai_app/app/`)
**Session end:** 21 commits into critical-findings remediation; paused before refactoring auth to httpOnly cookie
**Status:** both builds clean, DB migrated, backup intact, waiting on Glen's sign-off for one remaining critical fix.

---

## 1. What Glen asked for (verbatim)

> "I want you to fully back up the NBI Hub. I'm never going to reuse Paperclip, so if it's creating dead weight or confusion, we can remove it, but I would like to keep the definition of AI agents that we worked on if we can. I want to take every single problem starting with critical and work our way down until they're all fixed. After we're sure we've backed up everything on the NBI hub in case we need to roll back."

Translated to phases the receiving session should continue:

1. Back up (done)
2. Remove Paperclip (done)
3. Work through every audit finding, Critical first then Bad then Needs Review
4. Keep the agent definitions in `schema.ts` / `seed.ts` intact (they are NBI Hub's own)

Glen's style reminders that shaped the commit messages and copy:
- British English, no em-dashes
- Never water down or water down scope
- No fabricated numbers — always measured or cited
- Direct, no fluff

---

## 2. Two review reports were delivered before work began

Both were delivered inline in the chat. They drive the remaining work. Key structure:

- **First report:** 14 Critically Bad, 36 Bad, 17 Needs Review, 15 Good. Covered server + core client. 80 findings.
- **Augmented report:** added 8 Critically Bad, 25 Bad, 14 Needs Review, 8 Good — covering the 11 client pages, 12 shadcn primitives, globals.css, PageHeader, lib/utils.ts, all client build config. 55 additional findings.

**Total findings:** 22 Critically Bad, 61 Bad, 31 Needs Review, 23 Good.

If the receiving session needs the exact findings list back, it should re-read this handoff section by section plus the two report messages in the conversation history that preceded this one. All findings are numbered in both reports (#1-82 in the first, #83-136 in the augmented). Commit messages below cite the finding numbers they close.

---

## 3. Backup (take this seriously — already paid for)

### Git tag

```
hub-pre-audit-2026-04-17  ->  commit 581ed3e
```

Annotated message: "NBI Hub state before audit-fix sprint. Ref: code review 2026-04-17. Rollback target if any fix introduces regression."

### Filesystem archive + DB dump + README

Location: `D:/OneDrive/Claude_code/_nbi_backups/2026-04-17_pre-audit/`

Contents:
- `nbi-hub-source-2026-04-17.tar.gz` — 235 KB, 107 files, source-only (excludes node_modules, dist, logs, .env)
- `nbiai-db-2026-04-17.sql` — 133 KB, 2327 lines, pg_dump of the live `nbiai` Postgres database
- `env-backup.txt` — copy of `.env` (contains local DB password)
- `README.md` — rollback instructions (code via git or archive; DB via psql)

### How to roll back (summarised; README has full commands)

Code only (preferred):
```bash
git -C "D:/OneDrive/Claude_code/NBIAI_TEAM" checkout hub-pre-audit-2026-04-17 -- projects/nbiai_app/app
cd projects/nbiai_app/app && npm install && cd client && npm install && cd ..
npm run build
pm2 restart nbiai-api
```

Database (destructive — only if audit-fix migrations caused a problem):
```bash
"C:/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -U postgres -c "DROP DATABASE IF EXISTS nbiai"
"C:/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -U postgres -c "CREATE DATABASE nbiai OWNER nbiai"
"C:/Program Files/PostgreSQL/16/bin/psql.exe" -h localhost -U nbiai -d nbiai -f "D:/OneDrive/Claude_code/_nbi_backups/2026-04-17_pre-audit/nbiai-db-2026-04-17.sql"
```

---

## 4. Commits landed this session (21 in order, most recent last)

Parent of all these changes is `581ed3e`.

| SHA | Phase | Summary | Audit ref |
|---|---|---|---|
| `e506de0` | 3 | Remove Paperclip DB bootstrap script | #2 Critically Bad (creds) |
| `956b34f` | 4 | queue.ts:409 failed→done logic flip fixed; failed now goes to `blocked` | #1 Crit |
| `414c69e` | 4 | seed.ts requires BOARD_USER_PASSWORD; no default placeholder | #3 Crit |
| `29fe472` | 4 | PATCH/checkout/checkin tasks routes now require board+admin | #6 Crit |
| `646a973` | 5a | Dead `_BudgetsTabRemoved` + `ApiKeysTab` + `RevokeKeyModal` (-481 lines) | #96 Bad |
| `cd0fdc1` | 5b | Approvals decision vocabulary (`approved`/`rejected`/`changes_requested`) + APPROVAL_TYPE_CONFIG keys aligned with server in both ApprovalsPage and DashboardPage | #106 Crit, #107 Bad |
| `4c7f651` | 5c | FinancePage AgentCostsTab consumes real cost_logs shape; budget editor removed; Lucide title prop dropped | #89 Crit |
| `9e21e2b` | 5d | ProjectsPage mutation.error wrapped with Boolean() | (baseline tsc fix) |
| `408be6e` | 5e | All inline `apiFetch('/api/...')` switched to `/api/v1/...`; OverdueTab routes by item.type; client soft-delete via PATCH | #83 Crit, #101 Bad |
| `da3a553` | 5f | TaskDetailPage: taskComments/taskRelations field names, review vs in_review, checkout shape, TRANSITIONS matrix matches server verbatim | #84 Crit, #85 Crit, #103 Bad |
| `fde911a` | 5g | RoleDetailPage: AgentDetail re-typed to match server; stats/budget/knowledge/history rendered as placeholders when server has no data | #86 Crit, #104 Bad |
| `d1c0bf8` | 5h | Terminate via `agents.delete`; AddRelationModal uses POST /tasks/:id/relations with 'blocking' enum | #87 Crit, #88 Crit |
| `d4b4919` | 5i | InviteUserModal removes Board option | #90 Crit |
| `b1cf6f1` | 6 | companyId added to claude_desktop_sessions + cost_logs tables; sessions/queue/finance/executions routes all scope by company; `src/db/add-tenant-scope.ts` idempotent migration; backfilled 2 session rows on local DB | #4 Crit, #5 Crit, #13 Crit, #14 Crit |
| `6c609fd` | 7b | createWsClient reads access token via `getToken()` (was `localStorage.getItem('accessToken')` which was always null) | #8 Crit |
| `f13af00` | 7c | LoginPage catch reads `err.error.code` (was `err.status` — dead property) | #9 Crit |
| `4221d2e` | 7d | FX rate env-driven: server `GBP_USD_RATE`, client `VITE_GBP_USD_RATE`, both default 0.79 (GBP per 1 USD); `client/src/vite-env.d.ts` added so `import.meta.env` types resolve | #12 Crit |
| `05dc56e` | 7e | Dockerfile copies `src/db/migrations` into `dist/db/migrations`; Dockerfile CMD and railway.toml startCommand now run `dist/db/migrate.js` before server start; `--omit=dev` instead of deprecated `--only=production` | #10 Crit |
| `23dfa95` | 7f | Drop unused `JWT_REFRESH_SECRET` startup check; SETUP.md fully rewritten to reflect post-no-API env vars | #15 Bad, #25 Bad |
| `dee06c2` | 7g | `src/db/drop-orphaned-tables.ts` dropped physical `api_keys`, `agent_budgets`, `agent_heartbeats` tables (removed from schema.ts 2026-03-28 but still physically present) | #11 Crit (partial — drizzle snapshot consolidation still deferred) |

`git log --oneline 581ed3e..HEAD -- projects/nbiai_app/app` will reproduce this sequence.

---

## 5. Local environment state at handoff

- Repo: `D:/OneDrive/Claude_code/NBIAI_TEAM`, branch `master`, clean working tree
- Hub root: `D:/OneDrive/Claude_code/NBIAI_TEAM/projects/nbiai_app/app`
- Node: 20.x (per package.json engines and Dockerfile base)
- Postgres: 16 (path: `C:/Program Files/PostgreSQL/16/bin/`), running on localhost:5432
- DB: `nbiai`, owner `nbiai` (credentials in `.env`, mirrored to `env-backup.txt`)
- PM2: Hub was running prior to session per Glen's memory ("Dashboard + Hub both running (PM2)"). This session did not restart PM2. Recommend `pm2 restart nbiai-api` before exercising the app.
- Ports: server 3001 (per ecosystem.config.cjs), client dev 5173 (Vite)
- Server tsc: clean (0 errors, `npm run build` succeeds)
- Client tsc: clean (0 errors, `npx tsc --noEmit` in `client/` succeeds)
- DB state: tenant-scope columns backfilled, orphan tables dropped; `drizzle.__drizzle_migrations` table only knows about `0000_smart_grandmaster` (the two migration scripts run this session are NOT tracked there — deliberate)

---

## 6. Remaining work — Critically Bad (1 item; NEEDS SIGN-OFF)

### 7a — Refresh token to httpOnly cookie (audit finding #7)

**Why pending Glen's sign-off:** adds a new dependency (`@fastify/cookie`), changes the auth payload shape, and is the one Phase 7 item that would definitively break login on Glen's local box if shipped wrong. Glen responded "ok" to the autonomous batch but asked for a stop before this.

**Scope:**
1. `npm install @fastify/cookie` in `projects/nbiai_app/app`
2. In `src/index.ts` register `@fastify/cookie` before JWT
3. `src/routes/auth.ts` changes:
   - `issueTokens()` — remove `refreshToken` from the returned body; instead `reply.setCookie('refreshToken', rawRefreshToken, { httpOnly: true, sameSite: 'lax', path: '/api/v1/auth', maxAge: 30*24*60*60, secure: NODE_ENV === 'production' })`
   - `POST /login` — return `{ accessToken, user }` only
   - `POST /refresh` — read refresh token from `request.cookies.refreshToken` instead of body; re-issue as above
   - `POST /setup` — same as login
   - `POST /logout` — clear cookie with `reply.clearCookie('refreshToken', { path: '/api/v1/auth' })` in addition to deleting the session row
4. `client/src/lib/api.ts` changes:
   - Remove `localStorage.setItem('refreshToken', ...)` / `localStorage.removeItem('refreshToken')`
   - `setTokens()` now only stores accessToken in-memory
   - `clearTokens()` only clears the in-memory access token
   - `attemptRefresh()` — drop the body, add `credentials: 'include'` to the fetch options
   - `auth.login`, `auth.setup`, `auth.refreshWithToken` — add `credentials: 'include'` to their fetch options (go through `apiFetch`; add it there too for auth routes)
   - `auth.logout` — remove the body (server reads cookie)
5. `client/src/hooks/useAuth.ts` changes:
   - Remove `localStorage.getItem('refreshToken')` check in the mount useEffect
   - On mount, unconditionally call `auth.refresh()` (POST with `credentials: 'include'`); on success, set accessToken in memory and load `/me`; on failure, no user
6. `src/index.ts` CORS already has `credentials: true` at line ~85 — no change needed

**Risks / preflight:**
- If local Postgres has a current active session row for Glen, it'll still validate via the hash in the sessions table. But because the client no longer has the refresh token in localStorage, the silent-refresh will have no cookie on first load. Glen will need to log in once after deploy.
- `SameSite=Lax` works while client and server share an origin (production via `@fastify/static`, dev via Vite proxy). If the client ever moves to a separate origin, needs `SameSite=None; Secure` and CORS review.
- On a rollback to the `hub-pre-audit` tag, the existing session rows remain valid. Rolling back only affects the client-side token storage — Glen re-logs in, new sessions issued as before.

**Commit shape:** single commit `fix(hub): move refresh token to httpOnly cookie` referencing audit finding #7.

---

## 7. Remaining work — Bad (~60 items)

High-impact themes (numbered refs from the two reports):

- **Server polish:** #16 bcrypt/argon2 comment drift, #17 replay detection promised-but-absent, #18 refresh flow not transactional, #19 setup doesn't seed roles/agents, #20 removed api_keys encryption helpers still exported, #21 missing FK constraints on `tasks.parentTaskId` and `agents.currentTaskId`, #22 DB pool not closed on shutdown, #23 no security headers, #24 Docker runs as root (and `.dockerignore` missing), #26 PM2 env double-load, #27 parallel user-management routes, #28 email case inconsistency, #29 dashboard summary 7 separate COUNT queries, #30 cursor helper duplicated everywhere, #31 enum cast copy-paste, #32/33/34/35 validation + UUID + error-envelope cleanup, #36 checkout expiry advertised-not-enforced, #37 mark-done destroys prior output, #38 createClientSchema accepts dropped fields, #39 `monthlyTarget` hardcoded, #40 `REPO_PATH` Windows default, #41 no error boundary, #42 sidebar badge hardcoded, #43 queue/exec filters probe UUIDs, #44 WS heartbeat timer stack, #45 pg-listener reconnect loses handle, #46 seed email not company-scoped, #47 `auth.refresh()` dead method, #49 fire-and-forget audit writes, #50 login timeout race

- **Client contract follow-ups:** #91 `/finance/summary` shape mismatch (ytdRevenue etc), #92-94 FX + target magic numbers (partially addressed in 7d), #95 AddRevenueModal type→revenueType mismatch, #97 OrgChartPage hardcoded tree, #98 Data Analyst orphan, #99 Company settings tagline/country fields not in schema, #100 Reset-application-data button no handler, #102 Cash-flow projection just duplicates current month, #103-115 misc

**Recommended sequence for the next session (Bad):**

1. Client-server contract gaps that are still dormant footguns: #91 finance summary, #95 revenue type enum
2. Fix-cleanup: #17 refresh-token replay detection (security), #22 pool close on shutdown, #23 security headers (helmet)
3. Cross-cutting cleanups: #30 extract cursor helper, #31 shared enum constants, #34 shared UUID regex
4. Docker + Ops: #24 non-root user + .dockerignore
5. Removed-API leftover: #20 drop encryptApiKey/decryptApiKey from lib/crypto.ts
6. UX: #37 mark-done preserves agent output, #100 wire Reset button or remove

Each of these is a small commit. Same pattern as Phase 5: edit, tsc both sides, commit with audit ref in the message, move on.

---

## 8. Remaining work — Needs Review (~31 items)

Architectural notes Glen should decide on rather than fix reflexively. Most contentious:

- #51 Execution engine stubs (Sprint 2 resurrection vs permanent)
- #53-55 context-loader caching + parallelism + prompt-cache timestamp
- #57 WS map is process-local; PM2 cluster-mode would split
- #62 activity_log cleanup job mentioned in schema, absent in code
- #63 `fix-enum.ts` should become a Drizzle migration (related to the still-unfinished #11)
- #115 Client/server shape agreement — a broader "API contract" consolidation (OpenAPI?, tRPC?) to prevent future drift

These are conversations more than code changes. Don't sprint through them.

---

## 9. Memory updates to consider

Nothing in the current memory files (`C:\Users\gpbea\.claude\projects\D--OneDrive-Claude-code-NBIAI-TEAM\memory\`) conflicts with this session's work. Candidate additions:

- **reference** memory: `D:/OneDrive/Claude_code/_nbi_backups/` as the canonical pre-change backup location for future migrations (if Glen keeps using that path)
- **feedback** memory: "When running long fix sprints, commit every 1-3 file changes with audit refs in the message so each fix is independently revertable" — already de facto; worth codifying if the next session wants to know
- **project** memory: NBI Hub is in active remediation against a 2026-04-17 audit; ~82 critical/bad/review items remain after this sprint; the cookie-migration (7a) is the single remaining pre-sign-off critical

Decide based on whether these will stay true through the next few sprints.

---

## 10. Verbatim start-up prompt for the receiving session

Paste this to the new chat to resume cleanly:

> Read `projects/nbiai_app/session_handoffs/handoff_2026-04-17_hub_audit_fix_sprint.md` in full. You are picking up the NBI Hub audit-fix sprint. 21 commits already landed on master against tag `hub-pre-audit-2026-04-17`. Both builds are clean; local DB is migrated; backup is at `D:/OneDrive/Claude_code/_nbi_backups/2026-04-17_pre-audit/`. The next action needs my sign-off — Phase 7a, moving the refresh token from localStorage to an httpOnly cookie. See section 6 of the handoff for the exact implementation plan. Confirm when you've read it and I'll tell you whether to proceed with 7a or switch to working through the Bad findings list.

---

## 11. Files modified this session (reference for spot-checking)

Server:
- `src/db/schema.ts` (added companyId to claude_desktop_sessions + cost_logs)
- `src/db/seed.ts` (required BOARD_USER_PASSWORD)
- `src/db/add-tenant-scope.ts` **(new)** — idempotent tenant-scope migration
- `src/db/drop-orphaned-tables.ts` **(new)** — idempotent orphan cleanup
- `src/db/create-paperclip-db.ts` **(deleted)**
- `src/routes/queue.ts` (failed→blocked; company scope)
- `src/routes/tasks.ts` (board+admin on PATCH/checkout/checkin)
- `src/routes/sessions.ts` (company scope + consistent validateBody)
- `src/routes/finance.ts` (company scope; FX env)
- `src/routes/executions.ts` (company-scoped total count)
- `src/index.ts` (drop JWT_REFRESH_SECRET check)
- `SETUP.md` (complete rewrite)
- `Dockerfile` (migrations + pre-start migrate)
- `railway.toml` (migrate before start)

Client:
- `src/lib/api.ts` (added tasks.addRelation)
- `src/lib/websocket.ts` (auth token source fix)
- `src/pages/LoginPage.tsx` (error branching)
- `src/pages/ApprovalsPage.tsx` (decision enum + type keys)
- `src/pages/DashboardPage.tsx` (approval type keys)
- `src/pages/FinancePage.tsx` (AgentCostsTab rewrite; FX env)
- `src/pages/ProjectsPage.tsx` (error render cast)
- `src/pages/ClientsPage.tsx` (URL prefixes)
- `src/pages/SettingsPage.tsx` (dead code removal; URL prefixes; InviteUserModal board)
- `src/pages/TaskDetailPage.tsx` (field names, status enum, transitions, checkout shape)
- `src/pages/RoleDetailPage.tsx` (AgentDetail contract; terminate via delete)
- `src/vite-env.d.ts` **(new)** — build-time env types

Total diff: ~900 insertions, ~700 deletions across 24 files plus 3 new files and 1 deleted.

---

End of handoff.
