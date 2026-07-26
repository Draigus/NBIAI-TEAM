# Handoff -- 2026-07-26: Finance view built, Codex round 1 fixed, Codex round 2 OPEN. NOT committed, NOT deployed.

Resumed from the 2026-07-25 afternoon handoff. Glen chose the Finance view; it is built. Codex ran (the blocker is gone) and produced two rounds of findings. **Round 1 (11 findings) is fixed and tested. Round 2 (7 findings, 3 of them P1) is NOT fixed.** Nothing is committed. Nothing is deployed.

---

## READ THIS FIRST -- a false claim I made, corrected

Mid-session I told Glen: *"tests/fixtures/baseline-schema.sql ships a schema_migrations table already marked up to 088, so on a genuinely fresh database the runner skips every migration -- including 018, which adds clients.sector."*

**That was false.** I asserted it from a stack trace without testing it. Measured afterwards:

| Build path | Tables | `clients.sector` | schema_migrations |
|---|---|---|---|
| Live `nbi_dashboard_test` | 75 | present | 87 rows, max 88 |
| Fresh DB via `resetTestDb()` (baseline + migrations) | 75 | present | 87 rows, max 88 |

**The baseline rebuilds a correct schema from scratch. It is not broken.** Glen was right to push back; I should have run the experiment before making the claim.

---

## THE REAL DEFECT I FOUND (genuine, unfixed, production risk)

Testing the above surfaced a different and worse problem.

**Migrations alone cannot build the schema, AND the runner hides it.** On a genuinely empty database with no baseline:

```
[migrate-err] Migration Failed to apply migration 003_expense_reports.sql
migrations-only run: COMPLETED          <-- reported success
migrations-only -> tables: 18  clients.sector: 0
```

Reproduce: create an empty DB, call `require('./migrations/runner')(pool, log)` directly.

`migrations/runner.js:104-112` catches a failed migration, logs `error`, and then **`return`s normally**. The caller cannot distinguish "all migrations applied" from "003 exploded and I stopped at 18 of 75 tables".

**Why this matters in production:** `server.js` runs this at startup. A migration that fails on prod does not stop the boot. The server comes up, serves traffic against a half-migrated schema, and the only evidence is one log line. This is precisely why the pre-deploy hook has to ask a human to eyeball the log for "Applied migration 088" -- the runner will not fail loudly on its own.

**This also explains the 12 e2e failures I initially misread as my own regressions.** Playwright's `webServer` boots `server.js`, which ran migrations against the brand-new isolated DB, built the partial 18-table schema, and returned "successfully". `globalSetup`'s emptiness heuristic (`tableCount < 5`) then saw 18 tables, concluded the schema was fine, and skipped loading the baseline. Every fixture calling `createTestClient()` then failed on the missing `sector` column.

**Three separate fixes are needed. NONE are done:**
1. `migrations/runner.js` must **throw** on a failed migration instead of returning. Check every caller first (`server.js`, `tests/setup/reset-db.js`, `init-db.js`) and decide the startup behaviour deliberately -- serving on a partial schema is worse than refusing to boot, but that is a production behaviour change and is Glen's call.
2. `tests/e2e/playwright.config.js` + `globalSetup`: the `tableCount < 5` heuristic is too weak. Better signal: every migration version on disk must be present in `schema_migrations`, else force a full reset.
3. A regression test proving a deliberately-broken migration makes the runner throw.

I did not start these. It is a coherent piece of work and I would rather hand it over intact than leave it half-applied.

---

## Git state

- `HEAD` = `origin/master` = **`f2abd83`**. Two cadence commits landed DURING this session (`0df535e`, `f2abd83`), both intelligence files only, no code. `adfedb9` (the previous handoff's tip) is an ancestor.
- **No code commits this session.** Everything below is uncommitted working tree.
- Changed (tracked): `dashboard-server/lib/hiring-export.js`, `dashboard-server/public/css/dashboard.css`, `dashboard-server/public/js/domains/nbi-hiring-plan.js`, `dashboard-server/routes/hiring-plan.js`, `dashboard-server/tests/e2e/hiring-plan.spec.js`, `dashboard-server/tests/unit/hiring-plan-export.test.mjs`, `dashboard-server/tests/unit/hiring-settings.test.mjs`, `nbi_project_dashboard.html`
- New (untracked): `dashboard-server/migrations/088_contractor_workdays_per_month.sql`
- Diffstat: 8 files, +1186 / -175
- **Delete before committing:** `dashboard-server/tmp_seed_visual.cjs`. (`tmp_match_receipts.cjs` and `tmp_upload_receipts.cjs` are another session's and predate this work -- leave them.)
- Cache params are at **`?v=25`** for both `dashboard.css` and `nbi-hiring-plan.js`.

---

## GLEN'S DECISION THIS SESSION

**The Finance view.** Asked to choose between a fourth view button, a column chooser, cutting columns, or deferring. He chose the **fourth view button (Finance)**. Built.

---

## PART 1 -- Finance view + excluded-roles disclosure. BUILT. Verified by test suites, NOT re-verified visually since the Codex fixes.

**Why the two shipped together.** `lib/hiring-costs.js` costs an UNFILLED role at zero in every month (Glen 2026-07-24). A per-role Weighted/mo column beside totals built that way lets a reader sum the column by eye and land nowhere near the bottom line. Building Finance without the disclosure would have manufactured the exact cross-component contradiction the visual-pass rule exists to catch.

**New in `public/js/domains/nbi-hiring-plan.js`:**
- `_hpTableControls(caps, rate)` -- the filter/search/rate/action row extracted verbatim out of `renderHiringPlanTableView` so Plan and Finance share ONE implementation.
- `_hpPence` (exact to the penny), `_hpCurrentMonthKey`, `HP_FTE_TYPES`, `_hpBaseOnlyReason`, `HP_VALID_BASES`, `_hpMissingPayAssumption`, `_hpBudgetRefusal`, `_hpTotalsCoverage(roleIds)`, `_hpCoverageSentences`, `_hpCoverageNotice`, `renderHiringPlanFinanceView`.
- Finance button and dispatch, both gated on `caps.view_financials`.
- Coverage notice also added to the Monthly Costs view.
- CSS: `.hiring-plan-finance-table`, `.hiring-plan-unfilled`, `.hiring-plan-coverage-notice`, `.hiring-plan-total-hint`, plus the print block **relocated to the end of the hiring-plan section** (see below).

**Measured result of the thing Glen asked for:** Finance table at 1600x1100 -> `scrollWidth 1381 === clientWidth 1381`, **overflow 0**. The Plan table is still ~364px over; Finance is the answer to that, not a fix to Plan.

---

## PART 2 -- Codex round 1: 11 findings, ALL FIXED

Codex works. The blocker in the last two handoffs was specific to the `codex review --commit` orchestrator-helper path; **`codex exec --sandbox read-only` runs fine** (v0.145.0, model `gpt-5.6-sol`). Two hung orphan codex processes (44036, 73100) were killed first.

1. **P1 Totals rounded to whole pounds** beside a 2dp column (£20,167 printed under rows summing to £20,166.67). `_hpPence` now exact.
2. **P1 Missing pay assumptions invented.** `compensation_basis || 'annual'`, `compensation_currency || 'GBP'`. Both nullable (084); the engine REFUSES such rows. A role with no currency got a confident pound sign. Fixed on screen AND in `lib/hiring-export.js`, which ships inside the client workbook.
3. **P1 "Being paid now" counted future starters.** The engine charges from the month AFTER the start date. Totals now split: being paid now / filled but not charging / filled with no start date / unfilled run-rate / full run-rate.
4. **P1 The unfilled subtotal contradicted its own label.**
5. **P2 Contractor-only clients could not save working days** without inventing an FTE %. Also re-gated the "FTE weighting not set" notice on the value rather than row existence, so the fix does not silence it.
6. **P2 Stale settings reported as current** after a failed refresh (client-value check ran before the failure flag).
7. **P2 "Cost starts" stated dates the engine does not honour** for unfilled and denied roles.
8. **P2 Advertised-range sort compared raw currencies** while Budget and Day rate were FX-normalised.
9. **P2 Print colour lost the cascade** to `.hiring-plan-coverage-notice strong`.
10. **P3 Plan empty-state colSpan** off by one when Hiring manager hides itself.
11. **P3 Migration 088 comment** described an unreachable fresh-DB path.

Codex confirmed explicitly: **no new XSS/HTML-injection, no capability leak into the Finance view, and the cost engine never consults `contractor_workdays_per_month`.**

Also deduplicated three copies of the budget-refusal ladder (Plan, Finance, Roles card) into `_hpBudgetRefusal`.

---

## PART 3 -- Codex round 2: 7 findings, NONE FIXED. THIS IS THE TOP OF THE QUEUE.

Full text is saved into the repo at **`docs/codex-round2-findings-2026-07-26.md`** (untracked -- commit it with the rest).

1. **P1 `lib/hiring-export.js:53` -- the workbook still exports a day rate when currency is missing.** `dayRateFor()` validates engagement, amount and basis but NOT currency. Codex reproduced an annual contractor with 72000 and no currency exporting `333.33` with a blank Currency cell. The screen correctly suppresses it; the workbook does not. **This is the same class of defect as round-1 #2 and I fixed only half of it.**
2. **P1 `nbi-hiring-plan.js:518` -- the KPI strip still counts future and undated hires as current pay.** The KPI loop includes every `state === 'hired'` with no start-month gate, so it now contradicts the Finance totals I just corrected. Reuse `_hpTotalsCoverage`'s partition or apply the same gate.
3. **P1 `nbi-hiring-plan.js:523` -- KPI warnings conceal omitted roles and name the wrong cause.** The `if/else if` shows only the base-only warning when base-only and uncosted roles coexist; the approved KPI has no uncosted counter at all; and any base-only row is described as an FTE missing its weighting even when the real cause is missing engagement type.
4. **P2 `nbi-hiring-plan.js:2247` -- the sidebar bypasses the refusal ladder.** "Exact budget" falls back straight to "no salary on record". Fix: `_fmtBudget(p) || _hpBudgetRefusal(p, p.compensation_basis)`.
5. **P2 `nbi-hiring-plan.js:582` -- current-month classification uses the viewer's browser timezone.** Around a month boundary a non-UK viewer buckets roles differently from a UK viewer. Fix properly with a server-supplied `as_of_month` on Europe/London.
6. **P2 `lib/hiring-export.js:254` -- the exported Day Rate Formula is false for monthly contracts.** Workbook says `annual / 12 / days`; the code correctly does `monthly / days`.
7. **P3 `088_...sql:66` -- a remaining comment contradicts the corrected explanation above it.**

Codex round 2 also confirmed clean: coverage buckets are mutually exclusive and the full run-rate is exactly the sum of the four displayed parts; no new exploitable interpolation; no remaining print cascade collision; the advertised accessor's FX normalisation is correct.

**Non-Fable tier requires two consecutive CLEAN passes. We have had zero. Round 3 must run after round 2 is fixed.**

---

## Verification state -- stated precisely

| Check | Result | Covers the Codex round-1 fixes? |
|---|---|---|
| `npm test` (full unit) | **109 files, 1585/1585 passing, 0 failures**, 1110s | YES -- ran after them |
| `npx playwright test hiring-plan.spec.js` | **29/29 passing** | YES -- ran after them, on the isolated DB |
| Interactive Playwright visual pass | **STALE** -- last run at `?v=24`, BEFORE the Codex fixes | **NO** |

**The visual gap is the important one.** The round-1 fixes changed the totals rows, the Cost starts column, every Weighted/mo tooltip, and added new refusal states. All of that is visually impactful and NONE of it has been looked at in a browser. Per the project's own hard rule, this work cannot be called done until that pass is run.

Also untested: the new refusal states ("no pay basis recorded", "no currency recorded") have no fixture exercising them -- `tmp_seed_visual.cjs` defaults every role to GBP/annual. A successor should add a null-currency and null-basis role to the fixture.

---

## Environment state

- **PM2 untouched.** prod `nbi-dashboard` and staging `nbi-dashboard-staging` both online, never restarted this session. Prod still serves `?v=12` and has seen neither 087 nor 088.
- **:8889 is free.** 0 listeners. All vitest/playwright/server processes confirmed dead.
- **All codex processes killed.** 0 remaining.
- **Databases:** `nbi_dashboard`, `nbi_dashboard_staging`, `nbi_dashboard_test`, **`nbi_dashboard_test_iso`**. I dropped my two diagnostic DBs (`_scratch`, `_migonly`).
  - `nbi_dashboard_test_iso` is a **schema-identical clone** of `nbi_dashboard_test` that I created to escape the shared-DB contention described below. It is how the 29/29 e2e was obtained. **Keep it until the contention problem is solved, then drop it.** Run e2e against it with `DATABASE_URL=<...>/nbi_dashboard_test_iso`.

### Why the isolated DB exists -- shared-test-DB contention (UNRESOLVED)

Three separate incidents this session, all costing real time:

1. **`TaskStop` does not kill the vitest process tree.** It killed the wrapper shell; `npm` and `vitest.mjs` ran on for ~25 minutes truncating the shared test schema. Recorded in memory (`feedback_parallel_session_check.md`).
2. **Killed vitest leaves orphaned Postgres backends.** Two connections sat `active` on a `TRUNCATE` from 18:20 for over an hour, firing whenever locks freed and wiping freshly seeded fixtures. Clear them with:
   `SELECT pid, pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='nbi_dashboard_test' AND query ILIKE 'TRUNCATE%';`
3. **A cadence-spawned Claude session was running concurrently** (`NBI Cadence - intel-ingest`, started 19:00, plus a second `claude.exe`). Row counts moved on their own (0 -> 3 roles) while nothing of mine was running.

**Diagnostic that always tells you the truth:** if a seeded login suddenly 401s, run `SELECT count(*) FROM users` before debugging auth.

---

## Resume sequence

1. **Fix Codex round 2** (7 findings above). #1, #2 and #3 are P1 and #1 reaches the client workbook.
2. **Re-run `npm test` and the e2e suite** (e2e against `nbi_dashboard_test_iso`).
3. **Run the interactive Playwright visual pass** -- this is the outstanding hard-rule gap. Boot :8889 on `.env.test`, seed with `node tmp_seed_visual.cjs` (login `visualadmin` / `visual_pass_123`), and **add a null-currency and a null-basis role to the fixture first** so the new refusal states are actually on screen. Open Plan, Roles, Monthly Costs, Finance, and a print preview. Look at them.
4. **Codex round 3, then round 4** -- two consecutive clean passes before commit (non-Fable tier).
5. **Then** delete `tmp_seed_visual.cjs`, commit (suggest: one commit for Spec A + 088, one for the defect sweep + Finance view).
6. **Then** deploy staging-first: `pm2 restart nbi-dashboard-staging`, confirm "Applied migration 088" in the staging log, e2e against staging, then prod, confirm the migration line, curl for `?v=25`.
7. **Set Couch Heroes `contractor_workdays_per_month` to 18** (their own figure; currently UNSET so the standard 18 applies anyway, but setting it makes the provenance read "set for this client").
8. **The migration-runner work** (section 2 above) as its own piece, with Glen's decision on the startup behaviour change.

---

## Open with Glen

1. **The migration runner swallowing failures** -- making it throw changes production startup behaviour. Refuse to boot on a failed migration, or boot and alert loudly? My recommendation: refuse to boot, because serving on a partial schema is silent data corruption.
2. **Shared-test-DB contention.** Cadence sessions and interactive sessions both run tests against `nbi_dashboard_test`. Options: give each session its own DB by default (the `_iso` pattern), or add a lock. Right now "the suite is green" is only trustworthy if nothing else is running.
3. Jira Admin Contractor and Mid QA employment-type flips: still no answer (carried from two handoffs ago).
4. Gantt legend meanings for Monthly Costs (carried).

## Carried, untouched this session

- Gantt colour/bar styling of Monthly Costs; CH org chart deck restyle at `projects/couch_heroes/deliverables/2026-07-23-org-chart/`; settings modal copy (COO/FD mapping, recruiters, currencies sections still bare); `hiring_manager_user_id` and `requirement_type` unset on all 30 CH rows; FX refresh wiring; 09:00 cron email failures (parked); worktree cleanup for `.worktrees/hiring-plan-approval` and `fix-hiring-client-admin-controls`.

## Method lessons

- **I asserted a root cause from a stack trace without testing it, and it was wrong.** The baseline was fine. Twenty minutes of measurement would have prevented a false statement to Glen. Build the scratch database and diff it before naming a cause.
- **"Worth a bug-tracker item" is flagging, not fixing.** Glen called it out and was right.
- **A green suite is only green if nothing else is writing to the database.** Check for competing processes before trusting any run.
