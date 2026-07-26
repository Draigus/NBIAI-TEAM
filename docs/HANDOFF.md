# Handoff -- 2026-07-26 (Fable 5 session): Finance view COMPLETE, Codex CONVERGED, runner refuses to boot, AIOS collision repaired. COMMITTED. NOT pushed, NOT deployed.

**Commits (local, on master, ahead of origin by 4):**
- `1fa05d0` feat(hiring-plan): Finance view, defect sweep, Codex rounds 1-4 converged (11 files, +1544/-222)
- `d557983` fix(migrations): refuse to boot on failure; repair the AIOS 072 collision (6 files, +236/-71)
- `3a37ca7` docs: session records, Codex convergence, decisions, handoff (23 files)
- `bff80f7` chore(skills): .agents/skills originals removed (165 deletions; archive already tracked)

**Final suite results (post-ALL-edits):** solo `npm test` 109 files **1589/1589 green** (15:51, single writer); full e2e vs `nbi_dashboard_test_iso` **150 passed / 1 skipped / 0 failed**; foreground hiring-plan spec 29/29 (harness gate evidence); harness finish-task: **VERIFIED**. Glen's instruction 2026-07-26 evening: successor session picks up the fix list below.

Supersedes the 2026-07-26 morning handoff (finance-view-codex-round2-open, preserved in session_handoffs/). This session fixed all Codex round-2 findings, ran round 3 (10 findings: 7 fixed, 3 deferred with reasons), achieved a round-4 CLEAN PASS, implemented Glen's two decisions (migration runner refuses to boot; per-session test DBs pattern retained), repaired the AIOS 072 migration collision, fixed a print-output defect found by eye, and committed everything. Deploy is the successor's first job.

## Verification evidence (all named, all this session)

| Check | Result |
|---|---|
| `npm test` full unit | **109 files, 1589/1589 green** (single clean run after all edits; see caveat below on the very last re-run) |
| `npm run test:e2e` full, vs `nbi_dashboard_test_iso` | **150 passed, 1 skipped, 0 failed** (run AFTER all edits incl. print CSS + fixture fix) |
| `npx playwright test hiring-plan.spec.js` | 29/29 |
| Interactive visual pass (:8889 on _iso, seeded null-currency/null-basis/undated roles) | Plan, Finance, Monthly Costs, Roles, sidebar, print all LOOKED at; Finance totals reconcile to the penny (0 + 20,166.67 + 7,233.33 + 35,720.00 = 63,120.00) |
| Print emulation after CSS fix | All four views legible on white (viewport shots; fullPage "black box" proven a Playwright stitching artefact via elementsFromPoint) |
| Codex round 3 | 10 findings, docs/codex-round3-findings-2026-07-26.md |
| Codex round 4 | **VERDICT: CLEAN PASS**, docs/codex-round4-cleanpass-2026-07-26.md |
| Migration ledger | 88 disk files == ledger rows, names exact, verified by codex round 4 and unit test |

**Unit-suite caveat:** one mid-session chained run showed 11 failures in 1 file. Root cause: Codex round 4 ran CONCURRENTLY and its sandbox (file-read-only, network-open) executed Playwright globalSetup against the shared `nbi_dashboard_test`, truncating fixtures mid-suite. Single-writer violation, mine. A solo re-run followed; its result is in the session log's final entry -- do not trust any suite run that shared the machine with codex exec.

## What changed (committed this session)

1. **Codex round-2 fixes (7/7)**: export day-rate currency gate + "no currency recorded" basis; KPI strip gated on `start_month <= as_of_month` with independent cause-split warnings; server-supplied `as_of_month` (Europe/London, `currentMonthKey()` in lib/hiring-costs.js) consumed by `_hpCurrentMonthKey()`; sidebar Exact budget through `_hpBudgetRefusal`; workbook Day Rate Formula states all three bases; 088 comment corrected.
2. **Codex round-3 fixes (7/10)**: sidebar FX no longer invents "1 (GBP)"; sidebar weighted-fallback names true cause; export matrix startMonth uses currentMonthKey(); globalSetup pool closed once + strict (version,name) ledger check + duplicate-number detection; migrations unit test asserts names; 089 ledger name repairs (v27 suffix, v72 rename); print CSS moved to true EOF + covers all four views.
3. **Migration runner refuses to boot** (Glen decision 2026-07-26): runner.js throws on failure (rollback preserved, error carries migrationFile/Version); server.js listens only after migrations resolve, exits(1) on failure, gracefulShutdown guards pre-listen window; regression test proves a broken migration throws (temp-dir `999_broken_on_purpose.sql` via new `{dir}` option).
4. **AIOS 072 collision repaired**: ledger v72 held a renamed-away filename so `072_aios_actions.sql` never ran anywhere; prod had the tables (historical chain), every migrations-built DB lacked `aios_actions` + `aios_outbound_queue` and the AIOS cron errored every cycle. `089_aios_actions_repair.sql` creates both at prod's introspected shape (verified live 2026-07-26; no triggers) + repairs the two ledger name drifts. Baseline fixture seeds corrected names. Both test DBs repaired by hand (UPDATE, 1 row each x2).
5. **Print defect fixed** (found by LOOKING): themed dark surfaces printed money as invisible ink; hiring-plan print block forces white/ink across Plan, Finance, matrix (incl. wrap bg/max-height) and cards.
6. **e2e KPI fixture determinism**: Deep Filled start -> 2026-01-01 (a current-month start flips buckets when real time crosses first payday).
7. Cache-busts: `dashboard.css?v=26`, `nbi-hiring-plan.js?v=26`.
8. Housekeeping: 10 unexplained-modified deliverable PNGs restored from git; `.agents/skills` deletion (165 files, archived to `.claude/skills-archive/`) committed; scratch files cleared.

## Environment

- **PM2 untouched all session.** Prod (`nbi-dashboard`, :8888) serves `?v=12`, has NOT seen migrations 087/088/089. Staging (:8887) likewise pending.
- DBs: `nbi_dashboard` (prod), `nbi_dashboard_staging`, `nbi_dashboard_test`, `nbi_dashboard_test_iso` (keep until per-session DBs are implemented; e2e runs against it via `DATABASE_URL=...\_iso`).
- :8889 free; all codex/chrome/test processes killed. Playwright MCP browser may need its profile lock cleared (`SingletonLock`) if reused.
- Prod ledger verified read-only this session: same v27/v72 name drifts (089 repairs them on deploy), pending 087/088/089.

## Resume sequence (successor)

1. `git log --oneline -5` must show the four commits above at HEAD. **Push them** (git push; the push gate may ask for fresh foreground test evidence -- run `npx vitest run tests/unit/migrations.test.mjs tests/unit/hiring-plan-costs.test.mjs` foreground if blocked).
2. **Deploy staging-first** (deploy skill): `pm2 restart nbi-dashboard-staging`; confirm "Applied migration 087/088/089" in staging log; e2e against staging; then `pm2 restart nbi-dashboard`; confirm migration lines + `?v=26` served; confirm AIOS cron error gone (`relation "aios_actions" does not exist` must stop).
3. **Set Couch Heroes `contractor_workdays_per_month` = 18** after deploy (provenance reads "set for this client").
4. Glen decisions outstanding: (a) workbook raw Budget/CompMin/CompMax columns -- refusal text vs raw-data export for missing basis/currency; (b) init-db.js should run the migration runner? (currently baseline-only, documented); (c) cron registration before migrations resolve (narrow window; move cron start into the post-migration .then?); (d) per-session test DB implementation (decision taken 2026-07-26, generalise the _iso pattern -- NOT yet implemented); (e) Jira Admin Contractor + Mid QA employment flips (carried); (f) Gantt legend meanings (carried).
5. Carried, untouched: settings modal bare sections; hiring_manager_user_id/requirement_type unset on CH rows; FX refresh wiring; 09:00 cron email failures (parked); CH org chart restyle; worktree/branch cruft (.worktrees/{hiring-plan-approval, fix-hiring-client-admin-controls, fix-monthly-costs-honesty(orphan dir, breaks vitest path-filtered runs -- see below)}, worktree-bugbatch-2026-07-10, foundations-2-6, backup-pre-reword-20260716).
6. **Harness PRE-DEPLOY CHECK misfire**: fired ~10 times this session on markdown appends/test commands containing the word "deploy" (and once on a doc Write). The deployed fix does not cover word-in-text triggers. Separate piece; harness tests still not run.
7. `.worktrees/fix-monthly-costs-honesty` contains a stale repo copy without node_modules; `npx vitest run <path-substring>` collects its test copies and fails on missing dotenv. Remove the orphan dir (it is NOT a registered worktree) or always run vitest via npm test.

## Method notes for the successor

- dotenvx `.env` does NOT override exported env vars in this stack (plain dotenv semantics observed); DATABASE_URL exported before `node server.js` won: verified by logging in as an _iso-only user.
- `codex exec --sandbox read-only` CAN write to the database -- never run it while a suite is running.
- Browser caches the SPA HTML and `?v=` CSS aggressively; verify with a cache-busting query before concluding a CSS change "didn't work".
- Playwright fullPage screenshots can stitch phantom black regions on released-sticky wide tables; use viewport shots + elementsFromPoint before believing them.
