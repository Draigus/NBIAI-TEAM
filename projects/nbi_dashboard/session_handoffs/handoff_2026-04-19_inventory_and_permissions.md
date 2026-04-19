# Handoff -- WorkSage remaining work inventory (2026-04-19)

**Session:** Short administrative session. Fixed a permission-prompt bug in Claude Code settings and compiled a verified inventory of all remaining work. No code changes, no commits.

**Status:** WorkSage is running, no changes since last session. HEAD is `6ba4bff` on master.

---

## 1. What Glen actually cares about (vocabulary reset)

"NBI Hub" = **WorkSage** = `https://worksage.nbi-consulting.com`. Concretely:

- Frontend: `nbi_project_dashboard.html` (single-page HTML, ~18.5k lines, inline CSS + JS)
- Backend: `dashboard-server/server.js` (Express + PostgreSQL, ~8.3k lines)
- DB: `nbi_dashboard` on PostgreSQL 16 (localhost:5432, user `nbiai`)
- Process: PM2 app `nbi-dashboard` on port 8888 (cluster mode, instances: 1)
- Public via: `cloudflared tunnel run` -> `worksage.nbi-consulting.com` -> `localhost:8888`
- News sidecar: `projects/news-aggregator/` (PM2 app `nbi-news` on `127.0.0.1:8890`, proxied from `/api/news/*`)

Do not touch `_archive/nbiai_app/` -- that's dead Paperclip-derived code Glen doesn't want.

---

## 2. Permission prompts fix

Glen was getting prompted for every Bash/tool call despite having `"defaultMode": "dontAsk"` in the project-level `.claude/settings.local.json`. Root cause: the **user-level** settings at `C:\Users\gpbea\.claude\settings.json` had no `defaultMode`, so it defaulted to `"ask"` and overrode the project setting.

**Fixed:** Added `"defaultMode": "dontAsk"` to the user-level permissions block. This takes effect on the **next session start** (not mid-session). If prompts persist in the new session, something else is wrong -- check the VS Code extension settings separately.

---

## 3. Audit progress summary

**Source of truth:** `projects/nbi_dashboard/deliverables/worksage_audit_2026-04-18.md`

Total findings in the audit document:
- 20 Critical items: **16 shipped**, 4 remain
- 64 Bad items: **all open**
- 47 Needs Review items: **all open** (architectural/judgement calls, not reflex fixes)

Previous sessions also shipped items from Glen's feature backlog and bug tracker outside the audit. Combined total: 78 items shipped, 11 closed as non-issues.

---

## 4. Remaining work -- Critical audit items

### 4a. B-C1 -- Credential rotation (Glen's manual work, NOT code)

`dashboard-server/.env` contains live secrets inside an OneDrive-synced path. Rotate all four:

1. Azure portal -> App registrations -> create new client secret -> delete old. Update `AZURE_CLIENT_SECRET` in `.env`.
2. `ALTER USER nbiai WITH PASSWORD '<new>';` then update `DATABASE_URL` in both `dashboard-server/.env` and `projects/news-aggregator/.env`.
3. Generate two new 64-char hex values (`openssl rand -hex 32`), set `NEWS_INTERNAL_TOKEN` + `DASHBOARD_NOTIFICATION_TOKEN` identically in both `.env` files.
4. Move `.env` out of OneDrive to `C:\Users\gpbea\secrets\worksage.env`, update PM2's `ecosystem.config.js`.
5. `pm2 restart nbi-dashboard nbi-news`.

### 4b. F-C2 -- Session cookie port (high-risk, code)

Move auth token from `localStorage.nbi_auth_token` to `HttpOnly; Secure; SameSite=Lax` cookie. Touches: login endpoint, `requireAuth` middleware, every `authFetch` call, 401 redirect handler, `change-password`, logout. Blueprint available from archived `nbiai_app` commit `d6555e9`.

**Risk:** Can lock Glen out if shipped wrong. Verify login + reload + logout in the browser after every edit. Use a worktree per CLAUDE.md rules (touches >3 files in `dashboard-server/`).

### 4c. F-C7 -- Finance conflict UI (needs UX design, code)

`nbi_project_dashboard.html:9617-9636` -- on 409 from `/api/finance/save`, the handler drops in-flight edits with no conflict modal. Reuse the existing `#conflictModal` + `showConflict` pattern from tasks (see `~16969-16986` for the diff rendering). Needs per-row diff UI for finance items.

### 4d. B-C2 -- /api/restore per-row validation (mechanical, code)

`dashboard-server/server.js:1442-1453` -- `/api/restore` upserts arbitrary rows with no per-row schema check. Fix is ~200 lines of Zod schemas (one per restorable table) plus allow-list. Bundle with **B-B10** (settings PUT allow-list) and **B-B15** (bulk-tasks validation).

---

## 5. Remaining work -- Bad tier (64 items, priority picks)

Full list in the audit document. Highest value next targets:

| Ref | Issue | Why it matters |
|---|---|---|
| B-B3 | `auth/me` + `requireAuth` don't check `is_active` | Disabled users work for 7 days |
| B-B4 | `change-password` doesn't invalidate other sessions or `_tokenCache` | Password change is cosmetic |
| B-B5 | `trust proxy: 1` + XFF spoofing bypasses IP rate limits | Login brute-force unblocked |
| B-B13 | `/api/leads/pipeline/summary`, `/forecast`, `/reminders`, `/dashboard/summary` ignore client scope | G5 users see all revenue |
| B-B16 | Legacy `PUT /api/sync/tasks` is destructive full-replace with admin gate | One bad call wipes task table |
| B-B19 | Receipt OCR falls back to `api.ocr.space` demo key `'helloworld'` | Employee PII sent to free third-party |
| B-B25 | `/metrics` localhost check uses `req.ip` with `trust proxy: 1` | Spoofable, leaks internal metrics |

---

## 6. Remaining work -- Needs Review (47 items)

Architectural/judgement calls. Not bugs to fix reflexively. Examples:

- F-N8: 18,489-line single HTML file (strategic split decision)
- B-N2: 8,336-line server.js (strategic split by bounded context)
- F-N1/F-N2/F-N3/F-N5: Magic numbers scattered inline (partially addressed in Tier 3 commit `6ba4bff`)
- F-N14/F-N15/F-N16: CDN dependencies and cross-origin calls (F-N15 and F-N16 fixed in `4c736ac`)

---

## 7. Remaining work -- Feature backlog

| Item | Status | Notes |
|---|---|---|
| G5 -- Client-scoped users | Needs spec + brainstorming | Biggest feature. Lorenza/Couch Heroes use case. |
| News aggregator M3 frontend | Not started | 10 tasks in plan |
| News aggregator M4 search/admin | Not started | 7 tasks in plan |
| News aggregator M5 polish/launch | Not started | 5 tasks in plan |
| Email features | Spec done, **blocked on SMTP** | Plans at `plans/2026-04-16-email-features-*.md` |
| HC Page and Board (Z7) | Needs brainstorming | Bug tracker ID `a6c82c8c` |
| Hiring Page rewrite | In progress, needs brainstorming | Bug tracker ID `b7a2f97f` |
| Gantt dependency arrows (O6) | Needs brainstorming | Bug tracker ID `86be4df5` |
| SoW layer in hierarchy (Z6) | Needs brainstorming | Bug tracker ID `cb32b7f9` |
| Telemetry + BI dashboard | Plan exists, not started | `.claude/plans/serialized-hatching-anchor.md` |
| Finance P&L enhancement | Not started | Glen wants detailed true P&L |
| Employee sort (c73af494) | Open, ambiguous | Sort vs filter? Needs Glen input |

---

## 8. Blocked on external input

| Blocker | What it blocks |
|---|---|
| SMTP provider config | Email features, PM reports, password reset, warning system |
| `ANTHROPIC_API_KEY` in `projects/news-aggregator/.env` | Live LLM news pipeline (M2 code is ready) |
| Glen's credential rotation (B-C1) | Security posture (secrets in OneDrive) |

---

## 9. Environment / running state

```
PM2:
  nbi-dashboard  (cluster, 1 instance)  port 8888
  nbi-news       (fork)                 127.0.0.1:8890
  cloudflared    tunnel run

Cloudflared:
  tunnel ID:   2d70956e-f293-44e0-b333-a3a7482ab253
  config:      ~/.cloudflared/config.yml
  ingress:     worksage.nbi-consulting.com -> http://localhost:8888

PostgreSQL:
  host:        localhost:5432
  service:     "postgresql-x64-16" (Windows service)
  DB:          nbi_dashboard (owner: nbiai)

Working tree:
  repo:         D:/OneDrive/Claude_code/NBIAI_TEAM
  branch:       master
  remote:       none configured (local-only repo)
  HEAD:         6ba4bff

.env files (all gitignored, still inside OneDrive -- see B-C1):
  dashboard-server/.env
  dashboard-server/.env.bak-20260418
  projects/news-aggregator/.env
```

---

## 10. Verification protocol (repeat after every Dashboard-visible change)

Per `memory/feedback_dashboard_verification.md`:

1. Make the edit.
2. `pm2 restart nbi-dashboard` (and `nbi-news` if news-aggregator changed, after `cd projects/news-aggregator && npm run build`).
3. Open `https://worksage.nbi-consulting.com` in Chrome. Hard cache-bust: `location.href = location.pathname + '?_=' + Date.now() + location.hash`.
4. Exercise the feature (click through, don't just land on a route).
5. Check console for errors, network for failed requests.

---

## 11. Key rules from memory (non-obvious, easy to violate)

- **British English, no em-dashes, no emojis** in all output and commit messages.
- **Verify in browser against worksage.nbi-consulting.com**, not curl. Curl 200 is not "working".
- **No fabricated analysis** -- never relay sub-agent numbers as measurements. See `memory/feedback_no_fabricated_analysis.md`.
- **No scope-watering** -- never narrow scope to reduce effort. See `memory/feedback_no_scope_watering.md`.
- **No timelines** -- structure by milestone deliverables, not weeks/days.
- **Glen reviews finished products only** -- no phase gates, no intermediate approvals.
- **Worktree first** for changes touching >3 files in `dashboard-server/` or `nbi_project_dashboard.html`.
- **Auto-handoff at ~75% context** -- stop work and write full handoff to `docs/HANDOFF.md`.
- **Keep going** on agreed paths; stop-and-think when approach is unclear.

---

## 12. Start-up prompt for the receiving session (paste verbatim)

> Read `projects/nbi_dashboard/session_handoffs/handoff_2026-04-19_inventory_and_permissions.md` in full before doing anything. You are continuing the WorkSage (aka NBI Hub) audit-fix sprint. HEAD is `6ba4bff` on master.
>
> The full remaining-findings list lives in `projects/nbi_dashboard/deliverables/worksage_audit_2026-04-18.md`. 16 of 20 critical items are shipped. 64 Bad tier and 47 Needs Review items are all open.
>
> Four critical items remain:
> 1. **B-C1 credential rotation** -- Glen's manual work, do NOT do this in code; remind him when relevant.
> 2. **F-C2 session cookie port** -- high-risk, needs focused session with browser verification.
> 3. **F-C7 finance conflict UI** -- needs UX design.
> 4. **B-C2 /api/restore validation** -- mechanical Zod schemas.
>
> Feature backlog, blocked items, and priority Bad-tier picks are all in the handoff. Ask Glen what he wants to work on. Do not touch `_archive/nbiai_app/`. Confirm you've read the handoff before proceeding.

---

End of handoff.
