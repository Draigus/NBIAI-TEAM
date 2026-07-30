# Handoff -- 2026-07-28 (Opus 5 → Fable 5 session): DEPLOY COMPLETE. Spec audit done. Build work planned but NOT started.

## What session was doing

Started as an Opus 5 session reviewing the six outstanding decisions from the 2026-07-26
handoff with Codex adversarial review. Glen switched the session to Fable 5 mid-way, asked
for a damage check on the Opus work (none found -- it changed no code), then asked for the
best path to the real end goal: the hiring plan page actually finished and live.

That produced three things: a decision review (Codex rounds 1-2, NOT converged), a full
implementation-vs-spec audit of the hiring plan, and a completed staging→production deploy
of migrations 087/088/089. The remaining work is a five-plan build that has been
decomposed but not written or started.

## Completed

**Deploy (the headline -- resume steps 1-3 of the previous handoff are now ALL closed):**

- Pre-flight `npm test`: **109 files, 1589/1589 green**, exit 0 (1053s, finished 11:41).
- `pm2 restart nbi-dashboard-staging` -- log: "Applied migration 087 / 088 / 089",
  "Migration run complete applied:3". Staging DB max=89, health 200.
- `npm run test:e2e`: **150 passed, 1 skipped, 0 failed** (8.2m), exit 0.
- `pm2 restart nbi-dashboard` at 11:50 -- out.log: 087/088/089 applied, applied:3,
  "running on port 8888". Health 200. Serving `nbi-hiring-plan.js?v=26`.
- **Prod ledger now max=89**, and both name drifts repaired exactly as 089 intended:
  v27 → `027_audit_fixes.sql`, v72 → `072_aios_actions.sql`.
- **Zero errors in prod error.log since the 11:50 restart. Zero
  `aios_actions does not exist` occurrences** (the AIOS cron failure is fixed).

**Production data writes (direct SQL, prod `nbi_dashboard`):**

- `hiring_client_settings.contractor_workdays_per_month = 18` for Couch Heroes
  (returned `18.0000`, 1 row). Glen decision 2026-07-25.
- `hiring_client_settings.coo_user_id = 4a5930fe-fd69-406c-946b-8e4d7fb64c14` (Aris) and
  `finance_director_user_id = b8c56dcf-f8d2-4b5c-84a7-228118ed6dee` (Lili Zhao) for Couch
  Heroes. Both accounts verified active, client_role=admin, client=Couch Heroes before
  writing. This gives CH an approval chain for the first time.
- NOTE: these were direct SQL, so they did NOT pass through the app's audit log.

**Documents written:**

- `docs/decision-review-2026-07-27.md` (revision 3) -- the six decisions, Codex rounds 1-2.
- `docs/hiring-plan-spec-audit-2026-07-28.md` -- 170 requirements audited against the spec.
- `projects/nbi_dashboard/session_logs/2026-07-27_session.md` -- entries 1-9.

**Housekeeping:** deliverable PNGs under
`projects/nbi_dashboard/deliverables/` were overwritten by the e2e run (the
`warnings-light-theme` and mobile-audit specs write screenshots over tracked files) and
have been restored via `git checkout --`. **Expect this every e2e run.**

## Remaining -- in execution order

### FIRST: two things needing Glen, both blocking build work

1. **Aris and Lili have names, not email addresses, in `users.email`** (literally `"Aris"`
   and `"Lili"`). Prod error.log already shows `Recipient 'Aris' is not resolved` (Graph
   400). Now that they are the COO/Finance Director, every email notification to them will
   fail. In-app notifications are unaffected. **Glen must supply the real addresses** --
   do NOT modify prod user accounts without it (hard rule).
2. **Spec-vs-product divergence on the cost matrix.** Spec §10 says Approved and Pending
   roles cost from target start through the horizon. Implementation returns £0 for every
   non-hired role (`lib/hiring-costs.js:380-399`) -- Glen's 2026-07-24 decision, but the
   spec was never amended. Plan 5 cannot be written until Glen either amends the spec or
   revisits the decision.

### THEN: the five-plan build (decomposed this session, NOT written)

Each plan produces working, testable software on its own. Write with `writing-plans`,
execute with `subagent-driven-development`. Codex convergence required (2+ files on
non-Fable, and this is all multi-file).

- **Plan 1 -- Approval integrity** (highest value; the workflow has never run in prod:
  `hiring_approval_events` holds 33 `legacy_imported` + 1 `reopened_for_approval` and
  **zero** submitted/approved/denied).
  - Validation gate in `routes/hiring-plan.js:750-795` -- approve currently checks only
    version + capability, so a role with NULL budget/currency/basis can be approved (two
    live CH roles are: "UI/UX Lead / senior", "Lead Narrative Designer").
  - Submission notifications: `POST /api/hiring-plan` (`routes/hiring-plan.js:513-589`)
    never calls `notifyApprovalChange` (called only at :689 reopen, :803 approve, :930
    deny) and never writes a `submitted` event.
  - Config-missing guard on submission (spec §15).
  - `MATERIAL_FIELDS` (`lib/hiring-plan-permissions.js:51-56`) has 4 of the spec's 11
    reapproval triggers. Missing: title, seniority, discipline, compensation_min,
    compensation_max, compensation_basis, target_start_month, on_cost_override_pct.
- **Plan 2 -- Settings UI.** Modal (`public/js/domains/nbi-hiring-plan.js:2024-2100`) has
  only FTE weighting, contractor workdays, departments. No UI for COO, Finance Director,
  recruiters, permitted currencies, or department director assignment (all settable via
  PATCH already). 0/8 CH departments have directors; `hiring_recruiters` empty everywhere.
- **Plan 3 -- Create-path completeness.** Add Role modal
  (`public/js/domains/nbi-hiring-plan.js:1916-1933`) collects neither priority,
  requirement type nor hiring manager; API validates only `title`
  (`routes/hiring-plan.js:523-525`); no target-start enforcement. Root cause of CH's
  0/30 `requirement_type`, 0/30 `hiring_manager_user_id`, 0/30 `requested_by_user_id`.
  Add Role also hardcodes `compensation_currency='GBP'` (`:1966`).
- **Plan 4 -- Permissions and export.** `GET /api/hiring-plan/export.xlsx`
  (`routes/hiring-plan.js:1033-1041`) checks authentication only -- no capability gate,
  and spec §5 bars client users from exporting; UI button ungated (`:1143`). Cross-client
  FK validation absent (`routes/hiring-plan.js:179, 255, 553, 557` check UUID shape only).
  Recruiting's workbook carries no advertised range (`lib/hiring-export.js:94-95`). Export
  ignores filters and states none in metadata.
- **Plan 5 -- Cost matrix semantics** (BLOCKED on Glen decision above). "Cost setup
  needed" string does not exist anywhere in the codebase (grep = 0). Summary rows ignore
  active filters by design. Per-cell assumptions tooltips only on incomplete/base-only
  cells.

### Also outstanding (carried, unblocked, mechanical)

- **Harness PRE-DEPLOY CHECK misfire.** Root cause found:
  `.claude/settings.local.json:140-144` registers it with `"matcher": "Bash"` and an
  unconditional `echo` -- there is no command-text condition at all, so the previous
  handoff's "word-in-text triggers" diagnosis was wrong. Fix = filter inside the hook
  command (read the stdin JSON, inspect the command string) since Bash matchers key on
  tool name only.
- **Decision review is NOT converged.** `docs/decision-review-2026-07-27.md` -- Codex
  rounds 1 and 2 both FAIL; strict tier needs 2 consecutive clean passes. Round 3 owed.
  Decisions (a) export gap-marking, (c) cron ordering + missed-run policy, (d) per-session
  test DBs remain open. **Decision (f) Gantt legend does NOT belong to the hiring plan** --
  no Gantt exists in this feature; it belongs to the Tasks/Reports timeline
  (`public/js/views/nbi-gantt.js`).
- **Migration chain cannot build a blank database** (biggest structural finding of the
  Opus review, verified): `001_initial_schema.sql` creates neither `expenses` nor `leads`,
  but `003_expense_reports.sql:21` ALTERs `expenses`, `005_performance_indexes.sql:34`
  indexes `leads`, `027_audit_fixes.sql:14` indexes a `tasks.dependencies` column 001
  never creates. Those come from unversioned `migrate-expenses.js:16` /
  `migrate-leads.js:15`. This is a production disaster-recovery exposure.
- `.worktrees/fix-monthly-costs-honesty` orphan dir still breaks path-filtered vitest runs.
- CH `hiring_manager_user_id` / `requirement_type` still unset on all 30 rows (Plan 3).
- FX refresh wiring absent (no FX input/refresh/source-note UI anywhere).

## Decisions made this session

- Glen switched model to Fable 5 mid-session, worried Opus 5 had "fucked things up".
  Verified it had not: no code changes, no commits, no DB writes, no PM2 restarts.
- Glen: "I need all of the criteria met for the hiring plan page is that met?" -- this
  reframed the goal away from "deploy" and triggered the spec audit. The honest answer was
  no, and the audit quantified it.
- Glen: "take the best path plz" -- agreed path was audit + deploy in parallel, then close
  gaps. Both halves delivered.
- Glen: "okay, let's move forward" -- taken as approval to set Aris as COO and Lili Zhao as
  Finance Director for CH (explicitly proposed in the preceding message), and to begin the
  build work.

## Current state

- **Branch:** master. **Last commit:** `d6737ab chore(cadence): morning-brief run
  2026-07-28 [cadence]`. Not ahead of origin.
- **Dirty files:** `docs/HANDOFF.md` (this file) plus pre-existing cadence/intelligence
  churn (`intelligence/banks/*`, `intelligence/synthesis/*`,
  `scripts/cadence/state/routine_runs.json`, `projects/news-aggregator/src/sources/seed.json`)
  and untracked scratch (`dashboard-server/tmp_match_receipts.cjs`,
  `dashboard-server/tmp_upload_receipts.cjs`, various untracked deliverables).
  **Nothing from this session's work is uncommitted code** -- this session wrote no code.
- **New untracked docs to commit:** `docs/hiring-plan-spec-audit-2026-07-28.md`,
  `docs/decision-review-2026-07-27.md`,
  `projects/nbi_dashboard/session_logs/2026-07-27_session.md`.
- **PM2:** `nbi-dashboard` online (restarted 11:50), `nbi-dashboard-staging` online
  (restarted 11:41), both healthy. `nbi-voice` stopped (parked, correct).
- **Test status:** unit 1589/1589 green; e2e 150 passed / 1 skipped / 0 failed. Both run
  BEFORE the prod restart; no code changed after them.
- **No background tasks running.** Codex, vitest and Playwright all completed.

## Verification state

**Verified with named evidence this session:** the full deploy chain (suite output,
migration log lines, ledger queries, health codes, served asset version, error-log check);
CH settings writes (RETURNING values); Aris/Lili account state before assignment; and the
six highest-impact audit findings re-checked personally against source + live SQL
(approve has no validation, MATERIAL_FIELDS = 4 of 11, submission never notifies, export
ungated, "Cost setup needed" absent, CH had no COO/FD).

**NOT verified:** the audit's per-item verdicts and its 96/43/23/8 counts are the
subagent's, grounded in cited file:line evidence but not each re-run by me. The decision
review is not Codex-converged. **Glen's production visual check at
https://worksage.nbi-consulting.com has not happened** -- expect contractor/PSC day rates
on an 18-day basis with the basis stated, and the Finance view using a London-timezone
current month.

## Resume sequence

1. Read this file.
2. Read `docs/hiring-plan-spec-audit-2026-07-28.md` (the gap list driving all build work)
   and the last entries of `projects/nbi_dashboard/session_logs/2026-07-27_session.md`.
3. Verify state has not drifted: `git log --oneline -3`; `pm2 list`; and
   `SELECT MAX(version) FROM schema_migrations` on `nbi_dashboard` (must be **89**).
4. Ask Glen the two blocking questions if he has not already answered them: (a) real email
   addresses for Aris and Lili, (b) spec-vs-decision on planned-role costing.
5. Commit the three new docs (they are untracked and valuable):
   `git add docs/decision-review-2026-07-27.md docs/hiring-plan-spec-audit-2026-07-28.md
   projects/nbi_dashboard/session_logs/2026-07-27_session.md && git commit`.
6. Start **Plan 1 (Approval integrity)** with the `writing-plans` skill, then execute with
   `subagent-driven-development`. Do NOT attempt all five plans in one session.
7. Before claiming anything done: `npm test`, `npm run test:e2e`, interactive Playwright
   visual pass per CLAUDE.md, Codex convergence, then
   `node .claude/harness/lib/finish-task.js`.
8. After any e2e run, restore the deliverable screenshots:
   `git checkout -- projects/nbi_dashboard/deliverables/`.
