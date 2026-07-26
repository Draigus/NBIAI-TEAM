# Handoff -- 2026-07-21 (Hiring Plan implementation, Tasks 1-3 done)

> The previous content of this file (2026-07-15 WorkSage 9-of-10 handoff, being executed by a PARALLEL session in `D:\tmp\worktrees\foundations-2-6`) is preserved at `projects/nbi_dashboard/session_handoffs/2026-07-15_worksage-9of10-preserved.md`. Do not delete that file; the parallel session may still need it.

## What session was doing

Executing the approved WorkSage Hiring Plan implementation plan (`docs/superpowers/plans/2026-07-21-worksage-hiring-plan.md`, 16 tasks + preflight, written by Codex) via the subagent-driven-development skill: fresh implementer subagent per task, then spec-compliance review, then code-quality review, fix rounds until approved, then controller-verified test run. All work in the isolated worktree `D:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\hiring-plan-approval` on branch `codex/hiring-plan-approval`. Session ran on Fable 5. Glen approved the direction ("this is great can we move forward") after seeing the mockup. Stopped at the 30% context ceiling after Task 3.

## Completed

- **Mockup** (this session, before implementation): `docs/superpowers/mockups/hiring-plan-mockup.html` — interactive, 3 views + sidebar + persona redaction switcher + dark/light, built from WorkSage tokens, verified in Playwright. Exists in BOTH main worktree (uncommitted, docs surface) and feature branch (commit `401c157`). Glen approved it as the visual direction.
- **Preflight gate**: committed two orphaned tests on `codex/fix-hiring-client-admin-controls` as `8e21b98` (25/25 focused green); merged that branch into the feature branch as `e1ad866` (clean); baseline verified 48/48 unit + 2/2 focused ATS e2e.
- **Task 1 — schema**: `e575d05` (migrations/084_hiring_plan.sql + tests/unit/migration-084.test.mjs + tests/helpers/db.js) + hardening `cd3b3ed` (pre-flight guard raising loudly with row ids on unmapped employment_type; scoped UPDATE; idx_ prefix renames; idx_hiring_positions_department; explicit legacy-spelling test). Spec review compliant; quality APPROVED round 2. My verification run: 81/81 (migration-084 + ats-data-foundation + hiring-client-scope).
- **Task 2 — legacy parser + backfill**: `14268cc` (lib/hiring-legacy-parser.js, scripts/backfill-hiring-plan.js, tests/unit/hiring-legacy-parser.test.mjs) + fix `929c587` (currency cross-check hoisted to run in the Annual+Monthly conflict branch — was a real DB-write bug; false NOT NULL comment corrected; withdraw() keeps conflict lines visible in cleanDescription; skippedNotNull counter aligned). Spec compliant; quality APPROVED round 2. My verification run: 27/27.
- **Task 3 — cost engine**: `a7756b9` (lib/hiring-costs.js + tests/unit/hiring-costs.test.mjs) + spec fix `7ec4c76` (totals are calculable subtotals with incomplete=true, NOT null-poisoned — design spec s10 line ~314; GBP forces FX rate 1 per spec line ~133) + contract polish `7ca9adb` (public row shape fully snake_case; monthKeyOf exported; start_month preserved on excluded rows; null-sync + zero-means-unset comments; number-typed input test). Spec re-review confirmed (reviewer independently ran 59/59 and hand-checked subtotals); quality APPROVED. `7ca9adb` verified by suite (my run 61/61), not a third review pass — mechanical renames, no consumers yet.

## Remaining (execution order, from the plan)

Tasks 4-16 of `docs/superpowers/plans/2026-07-21-worksage-hiring-plan.md` (worktree copy is authoritative). Next: **Task 4 — lib/hiring-plan-permissions.js + tests/unit/hiring-plan-permissions.test.mjs** (capability matrix + response redaction). Then 5 (settings/department routes), 6 (plan CRUD APIs), 7 (approval workflow), 8 (cost API), 9 (Excel export), 10-14 (frontend), 15 (themes/regressions), 16 (docs, full verification, staging; Glen reviews staging before production).

**Carry-forward items (bound to specific tasks):**
- Task 6: routes/hiring.js must accept permanent/contract/freelance as aliases and STORE canonical fte/contractor/psc; then re-normalise any interim legacy rows and tighten the 084 employment-type CHECK to canonical-only via a follow-up migration (the CHECK currently permits six spellings — adjudicated deviation from Task 1).
- Task 8: the frozen cost-engine row contract is snake_case: role_id, state, excluded, incomplete, start_month, paid_minor, monthly_base_gbp_pence, monthly_loaded_gbp_pence, on_cost_pct, base_gbp_pence[], loaded_gbp_pence[]; matrix = {months, rows, totals, incompleteRoleIds}; totals buckets have base_gbp_pence[], loaded_gbp_pence[], horizon_base_gbp_pence, horizon_loaded_gbp_pence, incomplete. Month keys are 'YYYY-MM'. moneyFromPence passes null through.
- Task 9: monthKeyOf is exported from hiring-costs.js for Excel month normalisation; denied roles appear in rows with excluded:true and keep start_month.
- Task 16: the push hook reports "branch contains snapshot: commits that must be squashed before pushing" — investigate and squash before any push. Also: any staging DB that applied the e575d05 version of 084 must be reset (index renames never re-run).
- Cost engine limitation (documented in module): minor units fixed at 100 per major; zero-decimal currencies (JPY) unsupported — needs a minor-units table if a client enables one.

**MIGRATION NUMBER COLLISION RISK (flag to Glen):** the parallel 9-of-10 workstream's design (2026-07-15 handoff) reserves migrations 082-086 for its features. 082/083 exist on master; OUR branch took 084 (hiring plan). If the foundations session creates its own 084-086, the branches will collide on migration numbers at merge. Coordinate numbering before either branch merges to master.

## Decisions made this session

- Glen: "It built a great mockup. That is what I want." then "this is great can we move forward" — approval to execute the Codex plan. Execution mode (subagent-driven) chosen by me per the plan's own recommendation.
- Codex mockup was never saved to disk; my rebuilt mockup is the visual reference (Glen approved it).
- Commit-gate incident: RHO gate demanded web_search evidence for client_deliverables (dirty 2026-07-20 Couch Heroes Game Pillars files unrelated to this work). Satisfied with a genuinely needed search: UK employer NI 2026/27 = 15% above GBP 5,000 (employerscalculator.co.uk, moorepay.co.uk) — validates the 18% FTE on-cost default. HARNESS DESIGN FLAW to fix: commit gate checks ALL main-worktree surfaces globally; should scope to staged-file surfaces like the push gate does (verification-gate.js gateCommit vs gatePush).
- Preserved the 2026-07-15 handoff before overwriting (see banner above).

## Current state

- Branch: `codex/hiring-plan-approval` in worktree `.worktrees/hiring-plan-approval`
- Last commit: `7ca9adb` refactor: unify hiring cost engine contract naming
- Full branch sequence this session: 8e21b98 (on fix branch) → e1ad866 (merge) → 401c157 (mockup) → e575d05 → cd3b3ed → 14268cc → 929c587 → a7756b9 → 7ec4c76 → 7ca9adb
- Worktree dirty files: clean (verified via git status at handoff time)
- Main worktree: dirty with OTHER sessions' files (server files, Couch Heroes deliverables, harness edits, HANDOFF.md now mine, mockup + session log uncommitted) — do NOT clean up; not this workstream's property
- PM2: nbi-dashboard (:8888) and nbi-dashboard-staging (:8887) running, untouched this session
- Test status: last runs all green — 61/61 cost engine, 27/27 parser, 81/81 schema trio, 2/2 focused e2e (all my own runs, not subagent claims)
- Zombie process: `playwright test-server` PID 24408 (started 12:00, config dashboard-server/tests/e2e/playwright.config.js, idle) — possibly the parallel session's VS Code extension; left alive deliberately. Suspect if e2e fixtures vanish mid-run (shared nbi_dashboard_test schema poisoning signature; happened once in preflight, controlled rerun passed).

## Verification state

- Verified by me directly (evidence: my PowerShell/vitest runs in this session's transcript): all counts above.
- Verified by reviewers: spec compliance per task (line-by-line vs plan + design spec); quality per task (two CHANGES REQUIRED rounds resolved).
- NOT verified: nothing outstanding on Tasks 1-3. No staging deploy, no production changes this session.
- Evidence-ledger note: harness evidence records live in C:/Users/gpbea/.claude/harness/data/NBIAI_TEAM_aeb5ed/; commit gates re-scan on each commit; if a commit blocks on VERIFICATION GATE, run the relevant focused vitest first, then retry; the client_deliverables surface needs a web_search evidence record per session while those Couch Heroes files stay dirty in main.

## Resume sequence

1. Read this file fully.
2. Read `projects/nbi_dashboard/session_logs/2026-07-21_session.md` (bottom half — this session's entries) and `projects/nbi_dashboard/live_state/decisions.md`.
3. Verify state: `git -C D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/hiring-plan-approval log --oneline -3` must show 7ca9adb on top; `git status --short` there must be clean. Check no vitest/playwright is running machine-wide before any test run (single-writer rule; check the parallel foundations session).
4. Read the plan's Task 4 section: `docs/superpowers/plans/2026-07-21-worksage-hiring-plan.md` lines ~338-401 (worktree copy).
5. Invoke `subagent-driven-development` skill and continue the loop from Task 4 exactly as Tasks 1-3 ran: implementer (full task text + worktree path + environment cautions: single-writer test DB, VERIFICATION GATE retry procedure, PowerShell no-&&, British English) → spec reviewer (include both plan text AND relevant design-spec sections; the design spec is `docs/superpowers/specs/2026-07-21-worksage-hiring-plan-design.md` — Section 5 permission matrix is Task 4's authority) → quality reviewer → fix rounds → controller verification run.
6. Start today's/new session log entry per CLAUDE.md mechanical rules.
7. Flag to Glen at session start: the migration-number collision risk (above) and the commit-gate scoping flaw, if not already addressed.
