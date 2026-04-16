# Handoff — 2026-04-16b Full Day Session

**Written:** 2026-04-16 ~23:00 BST
**Author:** Claude (Opus 4.6)
**Reason:** Context getting heavy after massive session. Saving state before news aggregator work.

---

## Server State

| Service | Port | Status |
|---|---|---|
| nbi-dashboard (PM2) | 8888 | online |
| nbiai-api (Hub) | 3001 | online |
| PostgreSQL | 5432 | connected |

---

## What This Session Shipped

### Email System (complete)
- Microsoft Graph API transport (replaced nodemailer/SMTP)
- Shared mailbox: nbihub@nbi-consulting.com
- Azure AD app: "NBI Hub Dashboard" (client_id: bff14f81-99f8-4fbb-a2ca-e8f28631c200)
- Permissions: Mail.Send + Mail.Read (admin consented)
- Client secret expires: 2028-04-15
- PM daily report: 08:00 weekdays to team leads
- Due/late ticket warnings: 09:00 weekdays to assignees
- Inbound email-to-task: polls every 10min, fuzzy matches subject to client/task
- Verify badge + confirm/reassign workflow on auto-matched attachments
- Authenticated file downloads (was broken with direct URLs)

### Alerts/Notifications Consolidation
- Floating circle + bell merged into header bar "Alerts" button
- Three tabs: Warnings (verify emails, blocked, late, missing fields), Alerts, Notifications
- Task update/delete notifications to assignees
- System-wide admin messaging (Settings > Team)

### Client-Scoped Users (G5)
- Migration 026: client_id on users table
- External contacts see only their client (Lorenza test user created)
- Server: auth + scope filtering + 403 blocks on 40+ endpoints
- Frontend: sidebar hiding, client scope dropdown in user form

### Client Visibility by Team (Bug 4)
- getClientScopes() replaces getClientScope() at all data endpoints
- Internal users with teams see only their team's clients + NBI OPS + Playsage
- Users with no teams: unrestricted
- Admins: unrestricted

### UI Polish
- Sidebar reordered: Dashboard, Workload, Projects, People, Leads, Hiring, Finances, Expenses, Bug Tracker, Settings
- Sidebar collapsed tooltips
- Workload: Overdue | This Week | Blocked | At Risk in 4-column grid
- Imminent + This Week merged into single column sorted by urgency
- Critical/High filter actually filters by priority now
- Inline field changes: targeted DOM updates, no full page re-render
- Sync poll: soft re-render with cached standup, self-echo detection

### Bugs Fixed (code review + open bugs)
- BUG-1 CRITICAL: due-warning emails queried wrong column (display_name not username)
- BUG-4: _getGraphToken null guards
- SEC-1/SEC-2: attachment endpoints scope checks
- DEBT-1: batched assignee notification lookups
- DEBT-3: HTML escaping in email tables
- Dead code cleanup: nodemailer, floating alert CSS, duplicate vars
- +New dropdown emoji icons
- User creation duplicate email 500 error
- My Work Only case-insensitive matching
- Hiring assignee unassign (fetch before splice)
- Cancelled kanban capped at 20
- Filter by Team first-load fix
- SoW fetch in project detail (LEFT JOIN sows)
- Teams SoW linkage UI (editable dropdown)

### Tests
- 107 tests, 18 files, all green
- New test files: business-days, email-due-warnings, email-pm-report, email-matching, email-inbound, client-scope

### Database
- Migrations applied: 026 (client_id on users)
- All previous migrations (001-025) still in place

---

## Bug Tracker State

| Status | Count |
|---|---|
| open | 0 |
| in_progress | 7 |
| please_review | 16 |
| resolved | 55 |
| wontfix | 1 |

---

## What's Next

1. **News Aggregator** — Glen approved, design critique delivered, needs revised design + implementation as separate service
2. **UAT queue** — 16 please_review items awaiting Glen's testing
3. **Deferred code review items** — BUG-2 (sync poll conflict detection), BUG-5 (inbound email error handling)
4. **QuickBooks Time API** — blocked on Bryan's token
5. **Telemetry + BI Dashboard** — plan exists, not started

---

## Key Credentials

- Azure: tenant e7fae88b, client bff14f81, secret in .env
- DB: nbiai / NbiAi2026!SecureDb @ localhost:5432/nbi_dashboard
- nbihub mailbox: Roflma077! (but SMTP AUTH blocked by Security Defaults, using Graph API instead)
- Lorenza test user: lorenza / Lorenza2026! (scoped to Couch Heroes)

---

## How to Resume

```
cd D:\OneDrive\Claude_code\NBIAI_TEAM
pm2 list
curl http://localhost:8888/api/health
cd dashboard-server && npx vitest run
```
