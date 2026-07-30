# Outstanding decision review -- 2026-07-27 (revision 3, post Codex round 2)

> **STATE ADDENDUM, 2026-07-30 (Fable session), verified live.** The state table below
> records 2026-07-27 reality; the following has changed since and supersedes it:
> - **Deploy is DONE.** `schema_migrations` MAX(version) = 89 on both `nbi_dashboard` and
>   `nbi_dashboard_staging`; 087/088/089 present by exact name; ledger drifts repaired
>   (v27 = `027_audit_fixes.sql`, v72 = `072_aios_actions.sql`). Applied by the
>   2026-07-29 restart (both PM2 processes ~18h uptime at check). The migration runner
>   applying 087-089 at boot proves the running server.js is post-commit code, so the
>   frontend/backend skew below is resolved. AIOS `aios_actions` cron error: 0 occurrences
>   in current error.log. Prod and staging `/api/health` 200; both serve `?v=26`.
> - **CH `contractor_workdays_per_month` = 18.0000 is set** (live query, Couch Heroes row).
> - Decisions still open for Glen: (a), (b) remediation, (c), (d) implementation, (f).
>
> **Convergence:** rounds 1-2 ran under Opus 5 strict tier, both FAIL, all findings fixed
> in revision 3. Round 3 ran 2026-07-30 under Fable tier: Codex audited the code rather
> than this document and returned 10 findings. Every one was verified against source
> before acceptance (receiving-code-review): **six were WRONG** (the sidebar FX guard,
> sidebar cause split, export `currentMonthKey()`, print CSS placement and coverage,
> global-setup single `pool.end()`, and the version+name ledger checks are all in place,
> each with a comment citing the original finding); **three restate decisions (a), (b)
> and (c)**, already documented here as Glen's open calls; **one was REAL and new**:
> 072 creates `aios_outbound_queue` before 089 can, so 089's `IF NOT EXISTS` never adds
> prod's `worksage_task` value to the `destination_type` CHECK on any database 072
> reached first. Verified live: staging rejected `worksage_task` while prod, test and
> test_iso accepted it. Fixed by migration `090_aios_outbound_destination_check_repair.sql`
> (drop + re-add at the full shape, idempotent) with a regression test in
> `tests/unit/migrations.test.mjs`. On the review document itself Codex raised no claim
> of error; combined with the round-2 fixes all being re-verified in code this session,
> the document's factual content is treated as converged, with the 090 finding folded in.
> Revision 3 folds in round 2's findings, all verified against source before acceptance.
>
> **Headline for Glen, which is bigger than any single decision on the list:** the
> migration chain **cannot build a database from blank**. Verified: `001_initial_schema.sql`
> creates neither `expenses` nor `leads`, but `003_expense_reports.sql:21` runs
> `ALTER TABLE expenses`, `005_performance_indexes.sql:34` indexes `leads`, and
> `027_audit_fixes.sql:14` indexes a `tasks.dependencies` column 001 never creates. Those
> objects come from **unversioned one-off scripts** (`migrate-expenses.js:16`,
> `migrate-leads.js:15`) that are in no ledger and run in no automated path. Every working
> database exists because the chain was applied on top of a pre-existing baseline, never
> from zero. That is a disaster-recovery exposure for production, not just a test-fixture
> question, and it is why decisions (b) and (d) are both larger than the handoff frames them.

Review of the six outstanding decisions in `docs/HANDOFF.md` (resume step 4), plus live
state verified this session.

Revision 3 incorporates Codex rounds 1 and 2. **Codex found a critical error in revision 1's
recommendation on (b), a factual error on (f), and then a second critical error in revision
2's corrected (b).** Every finding was independently verified against source before being
accepted; none was taken on Codex's word. Where Codex and this review still disagree (one
point, on (e)), the disagreement is stated rather than smoothed over -- and Codex withdrew
that verdict in round 2.

---

## State corrections to the handoff

| Handoff claim | Verified state (2026-07-27) | Evidence |
|---|---|---|
| "NOT pushed, ahead of origin by 4" | **Pushed.** Resume step 1 is closed. | `git rev-list --count origin/master..master` = 0; all five commits (`1fa05d0`, `d557983`, `3a37ca7`, `bff80f7`, `09fcc43`) contained in `origin/master` |
| "NOT deployed" | **Confirmed not deployed.** | `schema_migrations` MAX(version) = 86 on `nbi_dashboard` and `nbi_dashboard_staging`; `hiring_client_settings.contractor_workdays_per_month` does not exist in prod; ledger drifts still present (v27 = `027_audit_fixes`, v72 = `072_seed_interview_questions.sql`), which 089 repairs |
| PM2 untouched | Confirmed | `nbi-dashboard` and `nbi-dashboard-staging` both 2 days' uptime, i.e. last restarted before the session's commits |
| Decision (e) outstanding | **Already done** -- stale carry | Live prod query: `Jira Admin Contractor` = `contractor`, `Mid QA Tester (Contract)` = `contractor`. Executed 2026-07-24, recorded `decisions.md:743` |

### Live frontend/backend skew on production

The SPA is static-served, so **production already serves `?v=26`** (curl-verified) while the
Node process runs the pre-commit `server.js` loaded two days ago against a pre-087 schema.

Traced: the session added **no new endpoints** (`git show --stat`), so the Finance view is
built client-side from the existing costs payload and does not 404. The one server-supplied
field the new frontend wants, `as_of_month`, is absent from the old route, and
`_hpCurrentMonthKey()` (`public/js/domains/nbi-hiring-plan.js:615`) degrades to the browser
clock. **The skew is soft, not breaking:** current-month bucketing follows viewer timezone
instead of Europe/London, and the workbook export runs old `lib/hiring-export.js` behaviour.

---

## (a) Workbook raw Budget / Comp Min / Comp Max columns

**Recommendation: keep raw numeric values in the raw columns. The stated choice is a false
one, and the code has already made the right split** -- refusals belong on a *derived*
figure of unknown basis, not on a stored fact. Confirmed by Codex.

Current code (`lib/hiring-export.js:93`, `:116-127`): under `caps.view_financials`, Budget /
Comp Min / Comp Max emit raw numbers; `Currency` and `Basis` are adjacent and blank when
unset; only the derived `Day Rate` is gated, with `Day Rate Basis` carrying the refusal.

**The residual risk is wider than revision 1 stated** (Codex, accepted):

1. Missing **Basis** is as dangerous as missing Currency -- annual, monthly and daily
   amounts stay summable in one column.
2. Writing `not recorded` into the Currency cell **improves visibility but does not prevent
   the wrong sum**. Excel sums the numeric cells regardless. Revision 1 claimed this
   "removes the hazard"; that was overstated.
3. The workbook is an **outbound-only GET export** (`routes/hiring-plan.js:1033`). Editing
   it does not repair WorkSage data, so "the client needs it to fix the gaps" is a weaker
   argument for raw values than revision 1 made it. The stronger argument stands: a stored
   figure is a fact and withholding it corrupts the export's purpose.
4. `Day Rate Basis` is forced blank whenever Budget is null (`:125`), even where the row
   most needs a missing-input explanation.

**Proposed close:** keep the amounts numeric; mark the gap only on rows where an amount
exists without Currency or Basis (distinguishing "no compensation entered" from "amount
entered, basis unknown"); and carry the marker as a data-quality column or conditional
formatting rather than prose in a cell that a reader may not look at.

## (b) Should `init-db.js` run the migration runner?

**Revision 1 recommended appending `runMigrations()` to `init-db.js`. That recommendation
was wrong and is withdrawn.** Codex caught it; verified against source before accepting.

The defect: `migrations/runner.js:63` treats the presence of a `tasks` table as "this is a
legacy database" and marks versions 1-7 applied **without executing them**. `init-db.js`
creates nine baseline tables including `tasks`, but **not** `bug_reports` (verified: it
creates `clients, contacts, tasks, task_notes, client_notes, settings, audit_log, users,
sessions`). So on a fresh `init-db.js` database:

- 001-007 are marked applied but never run, so every table 001 creates and `init-db.js`
  does not (attachments, comments, notifications, time entries, password reset tokens) is
  missing;
- `004_bug_reports.sql`, which creates `bug_reports`, is skipped;
- `010_bug_tracker_upgrade.sql:4` then runs `ALTER TABLE bug_reports ADD COLUMN ...` against
  a table that does not exist and fails.

Because the runner now **refuses to boot** on failure (this session's change), that failure
is loud rather than silent -- but a fresh install would simply not come up. Revision 1's
"most migrations are `IF NOT EXISTS` guarded" was not a safety argument: a guard does not
make `ALTER TABLE missing_table` valid.

**Revision 2 then proposed the opposite mechanism -- remove the baseline from `init-db.js`
and let 001-089 run from empty. Codex round 2 showed that is ALSO unsafe, and it is right.**
Verified against source: the chain cannot build a blank database at all.

- `001_initial_schema.sql` creates neither `expenses` nor `leads` (`grep` count = 0).
- `003_expense_reports.sql:21` runs `ALTER TABLE expenses ADD COLUMN report_id ...` and
  fails on a blank database.
- `005_performance_indexes.sql:34` indexes `leads` (and `lead_activities`,
  `lead_resources`, `expenses`, `expense_receipts`).
- `027_audit_fixes.sql:14` builds a GIN index on `tasks.dependencies`, a column 001 never
  creates.
- Those foundations come from **unversioned one-off scripts** -- `migrate-expenses.js:16`
  and `migrate-leads.js:15` -- which appear in no ledger and no automated path.

PostgreSQL 16.13 is in use (verified `SHOW server_version`), so `gen_random_uuid()` is
built-in and **not** a blocker. Migration 001 does seed settings and default clients, but
**not** the default users, so the user-seeding block at `init-db.js:172` must be retained
and must run only after the schema is built.

**Corrected recommendation: the answer to the decision as posed is NO -- not "yes in
principle".** Neither mechanism is safe today because the prerequisite does not exist: the
migration chain has no blank-database foundation. The real work, in order, is
(1) fold the unversioned `migrate-expenses.js` / `migrate-leads.js` foundations and the
missing `tasks.dependencies` column into properly versioned migrations, (2) prove it with a
blank-bootstrap test, and only then (3) decide how `init-db.js` composes with the runner.

Further prerequisites once that foundation exists:

- A test that builds a database from **blank** through the full chain. The existing
  `tests/unit/migrations.test.mjs` starts from the baseline fixture and asserts ledger
  completeness and idempotency, not blank bootstrap. This path is currently untested.
- The seed block (`init-db.js:157-191`: settings, six clients, six users with random
  bcrypt passwords) must be preserved and reordered to run **after** migrations.
- `init-db.js` uses `Client` instances (`admin`, `db`), not a `Pool`; the runner calls
  `pool.connect()` and expects a releasable client (`runner.js:101`). The call cannot simply
  be pasted in.
- Replacing the `DB_NAME = 'nbi_dashboard'` literal (`init-db.js:7`, which today disagrees
  with the `DATABASE_URL` used for table creation at `:24`) requires a real URL parser,
  identifier validation and quoting before interpolation into `CREATE DATABASE` -- not a
  raw substitution -- plus a check that `ADMIN_DATABASE_URL` and `DATABASE_URL` name the
  same host and port.

**Decision for Glen: yes in principle, but it is a piece of work with a test prerequisite,
not a one-line addition.**

## (c) Cron registration before migrations resolve

**The handoff understates this**, and revision 1 understated it too.

Verified:

- `server.js:549` calls the cron factory at **module top level** -- outside the
  `require.main === module` guard (`:585`) and outside the post-migration `.then()` (`:614`).
- Requiring `server.js` with `NODE_ENV=test` registers **12 live cron tasks**
  (`cron.getTasks().size` = 12, with the scheduler's own log lines printed). So every unit
  test importing `server.js` arms real timers against the test pool, and a long suite
  crossing 06:00 / 08:00 / 09:00 fires real jobs.
- **Correction to revision 1** (Codex, verified): there are **12** executable
  `cron.schedule()` sites, not 13 -- the 13th textual match at `cron/index.js:743` is the
  commented-out inbound-email schedule. The registered count is also environment-dependent:
  Granola is gated on `GRANOLA_API_KEY` (`cron/index.js:1045`), so an environment without
  that key registers 11.
- Codex confirmed the caller question: splitting registration out of the factory **does
  not** break the helpers destructured at `server.js:556-557`, because they stay
  synchronously constructed and are re-exported for tests at `:657-665`. Moving the whole
  factory call into `.then()` *would* break them.

**Critical omission in revision 1** (Codex, verified): the factory also runs an
**immediately-invoked dashboard-snapshot bootstrap** at `cron/index.js:822` -- an async IIFE
that queries `dashboard_snapshots` at construction time and swallows its error at `:837`. A
`registerSchedules()` split alone leaves it running before migrations and on every test
import, and if it fails because the table is not yet there, the error is swallowed and the
day's snapshot is never retried.

**Round 2 addition (accepted): there is no missed-run policy.** node-cron does not replay a
tick that passed before registration. A restart crossing a scheduled minute silently skips
that occurrence -- backup, FX refresh, Granola sync, daily reports, hiring reminders,
attachment sweep, Dreaming Engine -- until the next interval. The startup snapshot has
catch-up behaviour; nothing else does. Deferring registration until after migrations and
listen *widens* that window, so the ordering fix must ship with durable last-success state
for jobs that must not be skipped, or it trades one silent failure for another.

**Corrected recommendation:** (1) construct and export pure helpers synchronously;
(2) move **both** schedule registration **and** the startup snapshot job out of factory
construction; (3) run startup jobs after migrations resolve; (4) register schedules only
after the listener exists, since the AIOS executor calls the local HTTP server; (5) keep
cron-registration errors distinct from migration errors so the migration `.catch()` at
`server.js:637` does not mislabel them; (6) guard registration on
`require.main === module && NODE_ENV !== 'test'`.

## (d) Per-session test databases

**The blocking defect is confirmed.** `tests/setup/reset-db.js:26` guards on the *substring*
`nbi_dashboard_test`, which `nbi_dashboard_test_iso` and any `..._<session>` name passes,
while the kill statement at `:43-44` hardcodes `datname = 'nbi_dashboard_test'`. The schema
drop at `:53-56` then uses the configured target URL.

**Precision correction to revision 1** (Codex, accepted): an `_iso` reset **terminates
connections on the shared database** and then drops the schema on `_iso`. It does not
truncate the shared database. The victim suite fails, reconnects, or loses an in-flight
transaction. Calling it the same symptom as the concurrent-`codex exec` fixture truncation
was imprecise.

**Name derivation is necessary but not sufficient** (Codex, verified -- revision 1 missed
these):

- **Playwright still shares port 8889.** `tests/e2e/playwright.config.js:18` defaults
  `TEST_PORT` to 8889 and `:42` sets `reuseExistingServer: !process.env.CI`. Locally that
  means session B's tests **attach to session A's already-running server, which is connected
  to session A's database**. Isolated databases do not isolate anything while this holds.
- Session identity must produce both a database suffix **and** a unique port, propagated to
  global setup, the server child process and the test helpers.
- No lifecycle exists for deleting abandoned per-session databases.
- The guard should be an exact allow-list (`^nbi_dashboard_test(?:_[A-Za-z0-9_-]+)?$`,
  respecting PostgreSQL's 63-byte identifier limit), not a bare `startsWith`, and the parsed
  name must be passed as a `$1` parameter to the termination query.
**Round 2 addition (accepted): database and port are still not enough.** Shared state
survives both:

- **Uploads.** Every process uses the same `dashboard-server/uploads` directory
  (`server.js:73`), and tests create and delete fixed filenames (e.g. `g1_sweep_old.png`,
  `tests/unit/documents.test.mjs:1567`). Concurrent sessions delete each other's files
  regardless of database isolation.
- **`APP_URL`.** A unique `PORT` must also override `APP_URL`, which is captured at module
  import (`lib/email.js:10`); otherwise generated links keep the shared 8889 address from
  `.env.test`.
- **Playwright `outputDir`.** With no session-specific output directory, parallel runs share
  and clean the default `test-results`, destroying each other's traces and screenshots.

Full scope is therefore: database, HTTP port, `APP_URL`, upload/temp directories, Playwright
output directory, process ownership, and abandoned-resource cleanup.

- One centralised parser should serve `reset-db.js`, `create-test-db.js:22`,
  `tests/setup/load-env.js:11` and `tests/helpers/db.js:17`, which today each apply their
  own weaker substring test.

**Decision for Glen: implement, but the port and `reuseExistingServer` are part of the
scope, not a follow-up. Until then, do not generalise the `_iso` pattern.**

## (e) Jira Admin Contractor + Mid QA Tester employment flips

**Already done -- close the item.** Live prod query this session returns `contractor` for
both rows.

Codex marked this OVERSTATED on the grounds that it could not be established from source.
**That disagreement is resolved in this review's favour:** the claim rests on a live
database query run this session, and Codex could not reproduce it only because this review's
own prompt prohibited database access. The repository evidence Codex did check
(`decisions.md:743`, `2026-07-24_session.md:147`) independently corroborates it.

Codex's additive point is valid and is **not** closed: nothing prevents drift back. The
inline editor offers FTE / Contractor / PSC for every role
(`public/js/domains/nbi-hiring-plan.js:933`), so if "title-implied contractor" is meant as a
lasting data rule rather than a one-time correction, it needs a validation or data-quality
check. That is a new question for Glen, separate from the closed one.

## (f) Gantt legend meanings

**Revision 1 said "there is no way to derive the intended semantics from the repository".
That was wrong.** Codex found the source; verified.

`Clients/Couch Heroes/production/_v11_sheets.json` contains a `Legend` sheet that explicitly
defines the meanings -- phase super-headers, discipline colour groups (Leadership,
Production, Design, Art, Engineering, ...) and sizing. It is restored into the workbook by
the loop at `build_v12_clean.py:1495`, and `CouchHeroes_Man_Day_Work_Plan_v15.xlsx` is
present.

Gate progression, corrected (revision 2 compressed all five phases into "T0-T5"; Codex
round 2, accepted): Concept = T0; Pre-production = T1-T2; Production = T3-T5; Release =
T6 through T6-T7; Live Service = T7-T8.

**What genuinely needs Glen** is narrower than "what do the colours mean": it is which of
those semantics should transfer into a Monthly Costs treatment, given a live collision --
the current matrix already reserves amber for "base salary only" and green/amber/accent for
Approved/Pending/Combined totals (`nbi-hiring-plan.js:1873-1875`, `dashboard.css:3640-3642`). Reusing
those colours for phases or disciplines would give one colour two meanings on one screen.

The right next step is to extract the v15 legend, propose a mapping that avoids the existing
cost-status colours, and ask Glen only about the mapping choice.

---

## Also outstanding, not in the decision list

- **Deploy is the real blocker.** Revision 2 said resume steps 2 and 3 "cannot proceed in
  either order"; that was wrong (Codex round 2, accepted). There is a valid required order:
  **step 2 (deploy, applying 088) is not blocked and should go first**; only step 3 (setting
  Couch Heroes `contractor_workdays_per_month` = 18) is blocked, because the column does not
  exist until 088 is applied.
- **Harness PRE-DEPLOY CHECK misfire reproduced twice this session**, and the second
  instance widens the bug: it fired on a read-only `pm2 jlist` status read, and again on a
  `find`/`grep` command whose text contains **no** deploy-related word at all. Handoff item
  6 characterises this as word-in-text matching; that characterisation is now incomplete.
- **`.worktrees/fix-monthly-costs-honesty`** is an unregistered orphan directory that breaks
  path-filtered vitest runs. Removal is mechanical.

## Net effect of two Codex rounds

| Decision | Revision 1 | Revision 3 (current) |
|---|---|---|
| (a) | Keep raw; add `not recorded` | Keep raw; hazard is wider (basis too) and a text marker does not close it -- needs a data-quality marker or conditional formatting |
| (b) | **Append the runner to `init-db.js`** | **Answer is NO, both mechanisms are unsafe.** The chain cannot build from blank at all; fix the unversioned foundations and add a blank-bootstrap test first |
| (c) | Split registration out of the factory | Same, **plus** the startup snapshot IIFE, ordering after listen, error separation, **and** a durable missed-run policy |
| (d) | Fix the name derivation | Same, **plus** port 8889 / `reuseExistingServer`, uploads dir, `APP_URL`, Playwright `outputDir`, cleanup lifecycle, centralised parser |
| (e) | Done | Done -- Codex withdrew its OVERSTATED verdict in round 2. Open residue: no invariant prevents drift back to FTE |
| (f) | **Glen's call, no repo source** | **Wrong -- source exists.** Only the collision-free colour mapping is Glen's |

## Convergence status

| Round | Verdict | Findings |
|---|---|---|
| 1 | FAIL | 8 (1 critical, 2 high, 3 medium, 2 low) |
| 2 | **FAIL** | 6 (1 critical, 1 high, 2 medium, 2 P3) |
| 3 | **owed** | -- |

Strict tier requires **two consecutive clean passes**. There have been none. This review is
**not converged** and must not be treated as final. Round 3 should re-run against revision 3.
