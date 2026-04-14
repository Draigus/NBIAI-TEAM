# Session Handoff — 2026-04-15a (Double-Escape Storage Migration)

## Context
Glen confirmed tonight that he wants **Option C** — the full double-escape storage fix from the audit's Code Review H1. This was deferred originally because it touches every text field in the app. It's getting done now because the visible `&quot;`, `&#39;`, `&amp;` artefacts in bug-tracker comments (and other fields) are making the app feel broken.

This handoff exists so a fresh session can execute the migration without re-discovering the scope. Read it top to bottom before touching code.

## What the bug is

**Symptom:** User types `can't` in a text field. On display, they see `can&#39;t`. Each subsequent save turns it into `can&amp;#39;t`, then `can&amp;amp;#39;t`, and so on.

**Root cause:** Text fields are escaped twice — once by the server on write (`escHtml()` in `dashboard-server/server.js:279`) and once by the frontend at render (`esc()` in `nbi_project_dashboard.html:3243`). Both functions do the same replacements:

```js
str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
```

Because the `&` → `&amp;` replacement comes first, every subsequent round adds another `amp;` to any existing entity.

## The fix in principle

**Stop escaping at storage time. Escape only at render time.** Storing raw text is the correct model because:

- The DB should contain what the user typed
- XSS protection is the frontend's job via `esc()` at render
- Any consumer of the data (export, backup, API clients) gets usable text
- Re-serialising raw text doesn't compound entities

This is exactly the approach I took for the 27 plain-English review comments I rewrote via direct SQL earlier — they render correctly because they were stored raw and `esc()` runs once on the way out.

## Scope of this session

Four workstreams, in this order. Don't reorder — the migration depends on the code change landing first.

### Workstream 1 — Remove `escHtml()` calls from all WRITE paths

Every `escHtml()` call in `dashboard-server/server.js` that runs on a write path (POST / PATCH / sync) must be removed. **Keep** the calls in the public client report HTML endpoint (lines ~6485–6563) — that's a server-rendered HTML surface that does need per-interpolation escaping.

I counted **41 `escHtml` occurrences** in server.js. The ones to remove are the write-path calls; the ones to keep are the public-report render calls. Full list:

**Remove (write paths):**
- `3285` — tasks POST title + description
- `3331`, `3332` — tasks PATCH title + description
- `3336`, `3337` — tasks PATCH collaborations + success_factor
- `4617`, `4623` — leads POST title + notes
- `4686`, `4687` — leads PATCH title + notes
- `4955` — expenses POST description + notes
- `4990`, `4991` — expenses PATCH description + notes
- `5361` — bug reports POST title + description
- `5428`, `5434` — bug reports PATCH title + description
- `5508` — bug report comments POST text
- `5776`, `5777`, `5781` — candidates POST name + role + notes
- `5819`, `5820`, `5821` — candidates PATCH name + role + notes

**Keep (public render):**
- `605` — password reset email (server-rendered HTML via nodemailer)
- `6485`, `6489`, `6515`–`6563` — public client report HTML
- `281` — the `escHtml` function definition itself (used by the keeps)

**Do NOT** remove these without thinking:
- Any `escHtml` that's inside a template literal that gets written to a response
- `escHtml` used for email body rendering
- The helper function itself

Check with `grep -n "escHtml(" dashboard-server/server.js` and classify each one. Don't just blindly sed.

### Workstream 2 — Migration to decode existing double-escaped rows

The DB is full of existing rows with 1–N layers of escaping. They need to be collapsed back to raw text. Write migration `020_decode_double_escape.sql` that:

1. Iterates the affected columns on affected tables
2. For each row, runs a decode loop that unescapes HTML entities until a fixpoint (no more `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;` in the string)
3. Writes the decoded value back
4. Logs how many rows per table/column were changed

**Affected tables and columns** (verify this list in DB first — some may be missing or have extra):

| Table | Columns |
|---|---|
| `tasks` | `title`, `description`, `collaborations`, `success_factor` |
| `leads` | `title`, `notes` |
| `expenses` | `description`, `notes` |
| `bug_reports` | `title`, `description` |
| `bug_report_comments` | `text` |
| `candidates` | `name`, `role`, `notes` |
| `clients` | `description`, `nbi_relationship`, `current_studio_project` (maybe — check) |
| `contacts` | `name`, `role` (maybe — check) |
| `task_notes` | `text` |
| `calendar_events` | `title`, `description` |
| `teams` | `name`, `description` |
| `hiring_positions` | `title`, `description` |

**PostgreSQL decode function** (do NOT try to write this in a single regex — iterate until no change):

```sql
CREATE OR REPLACE FUNCTION decode_html_entities(s TEXT) RETURNS TEXT AS $$
DECLARE
  prev TEXT;
  curr TEXT := s;
BEGIN
  IF s IS NULL THEN RETURN NULL; END IF;
  LOOP
    prev := curr;
    curr := replace(curr, '&#39;', '''');
    curr := replace(curr, '&quot;', '"');
    curr := replace(curr, '&gt;', '>');
    curr := replace(curr, '&lt;', '<');
    curr := replace(curr, '&amp;', '&');
    EXIT WHEN curr = prev;
  END LOOP;
  RETURN curr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

Note the ORDER of replacements — `&amp;` must come LAST because the other entities might themselves contain an `amp;` that was added by a previous escape layer. Collapse `&#39;` → `'` before `&amp;` → `&`, not after.

Actually wait — think carefully about the order. A triple-escaped apostrophe looks like:
- Layer 1: `'`
- Layer 2: `&#39;`
- Layer 3: `&amp;#39;`
- Layer 4: `&amp;amp;#39;`

To collapse Layer 4 back to Layer 1:
1. `&amp;amp;#39;` → `&amp;#39;` (replace `&amp;` → `&`)
2. `&amp;#39;` → `&#39;` (same)
3. `&#39;` → `'`

So `&amp;` replacement does need to happen first, and the loop handles the iteration. The fixpoint loop is correct.

Let me re-verify with another example: `<` triple-escaped:
- Layer 1: `<`
- Layer 2: `&lt;`
- Layer 3: `&amp;lt;`
- Layer 4: `&amp;amp;lt;`

Decode:
1. `&amp;amp;lt;` → `&amp;lt;` (replace `&amp;` → `&`)
2. `&amp;lt;` → `&lt;` (same)
3. `&lt;` → `<`

Yes. `&amp;` first, then the specific entities. The order in the SQL function above is WRONG — it does `&amp;` last. **Fix the order when writing the migration:**

```sql
LOOP
  prev := curr;
  curr := replace(curr, '&amp;', '&');        -- MUST be first
  curr := replace(curr, '&#39;', '''');
  curr := replace(curr, '&quot;', '"');
  curr := replace(curr, '&gt;', '>');
  curr := replace(curr, '&lt;', '<');
  EXIT WHEN curr = prev;
END LOOP;
```

### Workstream 3 — Verify frontend still escapes at render

The frontend's `esc()` at line 3243 of `nbi_project_dashboard.html` is still needed and must stay. Spot check that every `${esc(...)}` interpolation in the template literals is still present. There are ~412 `esc(` occurrences in the frontend (grep confirmed) — almost all of them are render-time escapes inside template strings. Don't touch them.

Check also `escAttrJs()` (if it exists) for JS attribute contexts — those are separate and still needed.

### Workstream 4 — Test end-to-end

1. **Restart PM2** — run the migration on startup via `npm run migrate` or PM2 restart
2. **Pre-migration sanity check** — query a row you know contains `&quot;` or `&#39;` and confirm it's there
3. **Run migration** — inspect logs to see how many rows were updated per table
4. **Post-migration check** — same row should now contain raw `"` or `'`
5. **UI check** — open bug tracker comments, task descriptions, lead notes. Confirm the raw text renders correctly (browser should convert `'` to `'` via `esc()`)
6. **Round-trip test** — type `can't "quoted" <html>` into a new comment, save, reload, confirm it renders as `can't "quoted" <html>` — not `can&#39;t &quot;quoted&quot; &lt;html&gt;`
7. **Write test** — via the API POST a new task with body `{"title": "Task with & < > \" '"}` — confirm GET returns the raw text and the UI renders it correctly

## Things I already know that will bite you

1. **The `sanitisedBody` pattern at line 4686** (leads) — I only spotted the title and notes fields but there may be more. Grep for `sanitisedBody` and read the context.

2. **Bulk task POST at `server.js:3479-3518`** (if the line numbers haven't shifted) — the review audit M7 noted this path ALREADY skips `escHtml`. That's good for the new model but means imported tasks aren't double-escaped while interactive ones are. After the fix, both paths produce raw text. No change needed in the bulk path.

3. **Client reports are public and server-rendered** — those `escHtml()` calls at lines ~6485–6563 must STAY. They're the one legitimate use of server-side escaping because the server is generating the full HTML document, not storing data.

4. **`escAttrJs` in the frontend is separate** — used for onclick handlers where text is interpolated into a JS string literal inside an HTML attribute. It's different from `esc()` and still needed. Leave it alone.

5. **Email body rendering uses `escHtml`** — keep it. Emails are server-rendered HTML, not stored data. See line 605.

6. **Backups contain the old double-escaped data** — if you restore from a backup older than this migration, the data will be re-corrupted. Before running the migration, make a backup of the DB so you can roll back. After the migration, any backup taken AFTER can be restored safely. Mark this clearly in the changelog.

7. **The `rewrite_review_comments.sql` I ran earlier in this session** already stored 27 plain-English comments as raw text. After your decode-loop migration runs over `bug_report_comments.text`, those rows should be unchanged (decode is a no-op on already-raw text). Verify this by querying one of those rows before and after the migration.

## What I did NOT do that you might need

- **Did not audit which tables actually have legacy content** — some of the tables in my "Affected" list might be empty or might not have ever held double-escaped data. Query `SELECT count(*) FROM <table> WHERE <col> LIKE '%&%'` to scope the damage before running the decode loop. The decode function is a no-op on clean data, so running it on clean tables is safe but wasteful.

- **Did not check if there are JSONB columns with escaped content inside** — e.g. `tasks.blocker_info` is a JSONB blob and contains user-typed strings. If those were double-escaped going in, the decode loop won't touch them because it only targets TEXT columns. Scan JSONB fields manually:
  ```sql
  SELECT id, blocker_info::text FROM tasks WHERE blocker_info::text LIKE '%&amp;%' OR blocker_info::text LIKE '%&#39;%';
  ```
  If any come back, you'll need a separate decode pass that extracts the JSON, decodes strings inside, and writes it back.

- **Did not touch the `task_notes` append endpoint** — it may or may not call `escHtml`. Grep and verify.

- **Did not consider the `_serverUpdatedAt` conflict window** — while the migration is running, active users are writing to the same tables. If a user saves between the decode and the write, you'll overwrite their change. **Recommendation:** run the migration with `pm2 stop nbi-dashboard` first, then `pm2 start` after. Tell Glen to expect a ~30 second downtime when you run it.

- **Did not test the frontend's handling of raw `<` in user text** — after the migration, user text contains raw `<`. The frontend's `esc()` converts it to `&lt;` on render. Verify that edit inputs also work correctly: typing in an input should not pre-escape; reading the current value should be raw; saving should stay raw.

## State at the end of this session

- Both services online, PM2 state saved
- Production returning 200 on worksage.nbi-consulting.com
- 16 commits on master since the previous handoff
- The 27 plain-English comments I rewrote earlier via SQL are already in raw form
- Magnus's quick-win fixes from the earlier session are all shipped (header z-index cluster, sync RBAC, prerequisites nomenclature, role/position merge, client abbreviation field)
- The header overlap audit I ran immediately before this handoff is committed as `e11656c` with a full pass/fail table in `deliverables/header_overlap_audit_2026-04-15.md`

## Commits from this session (chronological)

```
c6a250b Magnus feedback sweep — header/z-index audit, sync RBAC, 3 quick wins
e11656c Full header-overlap audit — panels, modals + fixes across 5 viewports
```

## What's expected of the next session

1. Read this handoff top to bottom before touching anything
2. Do Workstream 1 — remove `escHtml` from write paths. Commit.
3. Do Workstream 2 — write the migration. Query the affected tables first to scope damage. Commit.
4. Stop PM2, run the migration, start PM2.
5. Do Workstream 4 — test end-to-end. Round-trip a string with `& < > " '` through the API and the UI.
6. Commit a short note to `deliverables/` documenting the row counts touched per table.
7. Tell Glen it's done.

Do NOT start Workstream 2 before Workstream 1 is committed. The decode loop should run AFTER new writes stop producing escaped content — otherwise you're decoding while the system is still writing fresh escaped rows, which is a losing battle.

## Priorities after this migration is done

Glen's open backlog (roughly priority order):

1. **SMTP decision** — blocks Due & Late warnings (f3a5e888) and PM Report system (ae561c32). Needs him to pick a provider (SendGrid / Postmark / AWS SES).
2. **Glen reviews the please_review queue** in the Bug Tracker — ~28 items. A 20-minute sit-down with Magnus after this migration would clear most of them.
3. **Light theme visual QA** — glen should switch themes and walk through the new Bug Tracker Kanban, Hiring Kanban, and Warnings sidebar.
4. **Hiring Page v1 observation period** — watch Magnus use it for a week before iterating, then have the conversation about her 1,500-word spec rework.
5. **Client > SoW > Project > Ticket tree** — reframe as a filter-on-Projects rather than a new navigation level. 10-minute conversation with Magnus needed.
6. **httpOnly cookie auth migration** (Security H4) — 1-2 days, dedicated sprint
7. **xlsx replacement** (Security H1) — days, dedicated sprint
8. **Telemetry / BI analytics dashboard** — planned, 3 sprints

## Files I'd reach for first in the next session

- `dashboard-server/server.js` — write-path fixes, ~12 `escHtml` call sites
- `dashboard-server/migrations/020_decode_double_escape.sql` — new file, decode function + UPDATE statements
- `nbi_project_dashboard.html` — only if you spot something in the frontend that's relying on the stored text being pre-escaped. I don't think there is, but verify.

## Rollback plan if it all goes wrong

1. `pm2 stop nbi-dashboard`
2. Restore DB from the pre-migration backup
3. `git revert <migration commit>` to put the escHtml calls back
4. `pm2 start nbi-dashboard`
5. Tell Glen it blew up and you need more time
