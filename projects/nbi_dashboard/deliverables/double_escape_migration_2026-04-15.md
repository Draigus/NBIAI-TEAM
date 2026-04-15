# Double-escape migration — 2026-04-15

## What this fixes

Every text field in the app was being escaped twice — once on write by
`escHtml()` in `dashboard-server/server.js`, once on render by `esc()` in
`nbi_project_dashboard.html`. Each round added another layer of HTML entities,
so `can't` became `can&#39;t`, then `can&amp;#39;t` on the next save, and so on.
The bug surfaced most visibly in bug-tracker comments, task descriptions, and
lead notes.

The fix is to store raw text in the DB and only escape at render time. That's
what the 27 plain-English review comments from earlier this session already did;
this migration extends the same treatment to everything else.

## Workstreams

| W  | Action                                                                 | Commit     |
|----|------------------------------------------------------------------------|------------|
| W1 | Remove `escHtml()` from all write paths in `server.js`                 | `203dad6`  |
| W2 | Migration `020_decode_double_escape.sql` — collapse existing entities  | this commit|
| W3 | Verify frontend `esc()` untouched (412 usages, function @ line 3243)   | —          |
| W4 | Round-trip test: POST / PATCH / comment POST / GET / DB                 | —          |

## W1 details

21 write-path call sites removed across these endpoints:

| Endpoint                             | Call sites              |
|--------------------------------------|-------------------------|
| `POST /api/tasks`                    | title, description      |
| `PATCH /api/tasks/:id`               | title, description, collaborations, success_factor |
| `POST /api/leads`                    | title, notes            |
| `PATCH /api/leads/:id`               | title, notes            |
| `POST /api/expenses`                 | description, notes      |
| `PATCH /api/expenses/:id`            | description, notes      |
| `POST /api/bug-reports`              | title, description      |
| `PATCH /api/bug-reports/:id`         | title, description      |
| `POST /api/bug-reports/:id/comments` | text                    |
| `POST /api/candidates`               | name, role, notes       |
| `PATCH /api/candidates/:id`          | name, role, notes       |
| Monthly expense reminder cron        | notification body       |

The notification-body site (line 6804 at the time of commit) was missed by the
handoff — it was caught by a full grep sweep during W1.

Kept the `escHtml()` function itself plus the public client-report HTML
endpoint and the password-reset email, which ARE server-rendered HTML
documents and need per-interpolation escaping.

## W2 details — row counts

Scope check before the migration:

| Table / column                 | Rows with any `&` | Actual entity sequences |
|--------------------------------|------------------:|------------------------:|
| `tasks.title`                  |              354  |                      0  |
| `tasks.description`            |               16  |                      2  |
| `tasks.collaborations`         |                0  |                      0  |
| `tasks.success_factor`         |                0  |                      0  |
| `leads.title`                  |                0  |                      0  |
| `leads.notes`                  |                0  |                      0  |
| `expenses.description`         |                5  |                      0  |
| `expenses.notes`               |                0  |                      0  |
| `bug_reports.title`            |                1  |                      0  |
| `bug_reports.description`      |               16  |                     14  |
| `bug_report_comments.text`     |                3  |                      3  |
| `candidates.*`                 |                0  |                      0  |
| `clients.description`          |                0  |                      0  |
| `clients.nbi_relationship`     |                1  |                      0  |
| `clients.current_studio_project`|               0  |                      0  |
| `contacts.name`                |                0  |                      0  |
| `contacts.role`                |                7  |                      0  |
| `contacts.notes`               |                2  |                      0  |
| `task_notes.text`              |                0  |                      0  |
| `calendar_events.*`            |                0  |                      0  |
| `teams.*`                      |                0  |                      0  |
| `hiring_positions.*`           |                0  |                      0  |
| `tasks.blocker_info` (JSONB)   |                —  |                      0  |

The first column is noisy — `R&D`, `DS&A`, `P&L` all match `%&%`. The second
column is what actually needed decoding.

**Rows decoded: 19**
- tasks.description: 2 (Microsoft Teams planner URLs whose `&` query separators had been escaped once)
- bug_reports.description: 14 (e.g. `&quot;Client&quot;` → `"Client"`, `I&#39;m` → `I'm`)
- bug_report_comments.text: 3

All 19 rows were single-layer escapes (no `&amp;amp;...` triple-layers in the
live data). The decode function iterates to a fixpoint so it would have
handled deeper layers if they existed.

## W3 / W4 results

- Frontend `esc()` at `nbi_project_dashboard.html:3243` unchanged. 412 call sites still present.
- API round-trip with `can't "quoted" & <tag>`:
  - `POST /api/bug-reports` → returned raw text, DB stored raw
  - `PATCH /api/bug-reports/:id` → returned raw text, DB stored raw
  - `POST /api/bug-reports/:id/comments` → returned raw text, DB stored raw
  - `GET /api/bug-reports` (list) → returned raw text
- Local + production health checks: 200

## Backup

Pre-migration full backup: `dashboard-server/backups/pre_migration_020_20260415_032100.sql` (4.3 MB)

To roll back:
```
pm2 stop nbi-dashboard
export PGPASSWORD='<...>'
psql -h localhost -U nbiai -d nbi_dashboard < dashboard-server/backups/pre_migration_020_20260415_032100.sql
git revert <this commit> <W1 commit>
pm2 start nbi-dashboard
```

## Follow-ups

None required for this fix. The next items on Glen's backlog (per handoff) are:
1. SMTP provider decision (blocks Due & Late warnings + PM Reports)
2. The 33 `please_review` queue items in Bug Tracker
3. Light-theme visual QA on Kanbans + warnings sidebar
