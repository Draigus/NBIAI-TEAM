# Handoff: Detail Renderer Unification — Execute Tasks 2-15

**Date:** 3 July 2026 (session D handoff)
**Resume in a fresh session.**

## State at handoff — everything verified first-hand this session

- **master at `74c6290`.** Three new commits this session, all gate-verified:
  - `097f2fb` fix(tests): pool poisoning — retype.test.mjs called `afterAll(end())` on the CJS require-cache-shared pool (single fork), killing 44 downstream test files (314 tests). `end()` deleted from tests/helpers/db.js entirely; lifecycle contract documented there. This was the REAL cause of the handoff-C "stale fixture" noise theory — that theory was wrong; global-setup and the fixture are fine.
  - `a722407` fix(tests): client-scope test created a root 'project'; hierarchy spec s3.3.6 flipped root enforcement to 'initiative' (routes/tasks.js:189-193 is correct). Test was masked by the pool bug since the merge.
  - `74c6290` docs: the implementation plan + Codex round-1 fixes + session logs + e2e screenshot refreshes.
- **Test baseline is FULLY GREEN, first time since the hierarchy merge:** `npm test` 980/980 (74 files, ~8 min); `npm run test:all` e2e 83 passed / 1 pre-existing skip (~4 min). Verified in main checkout AND in the worktree.
- **Worktree ready:** `.worktrees/detail-renderer-unification`, branch `feature/detail-renderer-unification`, npm install done, `.env`/`.env.test` copied from main checkout (untracked — recopy if worktree recreated). Baseline 980/980 in worktree.
- **Task 1 COMPLETE at `2b2bf20`** (worktree branch): `tests/e2e/detail-render-snapshots.spec.js` + 14 committed baselines under `tests/e2e/snapshots/detail-render/` (7 cases x 2 panels). Compare mode re-run first-hand: 2 passed, 9.3s. Coexistence + paired-helper test included (both panels in DOM, ID uniqueness, addNote/addNoteInline round-trip against a real DB task).

## THE TASK: execute plan Tasks 2-15

**Plan:** `docs/superpowers/plans/2026-07-02-detail-renderer-unification.md` — read it IN FULL first. It is Codex-reviewed (9 findings fixed, recorded at the bottom of the plan) and written for zero-context executors. Byte-identical snapshot gate on every task; baselines are ALWAYS right, code is wrong — the single sanctioned baseline regeneration is Task 15 Step 3.

**Method used for Task 1 (recommended for the rest):** dispatch a fresh subagent per task into the worktree with: plan path, task number, "follow steps exactly", commit instruction, and a demand for a precise report. Then VERIFY the report first-hand (re-run the snapshot spec, read changed code, check the commit) before dispatching the next. Task 1's agent needed zero code fixes — the plan is precise enough.

**Run all test commands from the worktree's `dashboard-server/`:**
```
npx playwright test --config=tests/e2e/playwright.config.js detail-render-snapshots.spec.js
```

## Critical knowledge for Tasks 2-15 (beyond what the plan says)

1. **Overlay baselines are DOM-normalised** (captured via `innerHTML`): `data-prevent=""`, `selected=""`, quoted/reordered entities. Inline baselines are raw template output. NEVER compare baselines to source literals by eye — only through the harness. (Task 1 agent flagged this; it is expected and harmless.)
2. **Gate 1 (commit) needs FOREGROUND `npm test` evidence** — background runs do NOT register with the evidence hook. If a commit blocks with "Missing: tests: unit_test", run `npm test` foreground (~8 min, expect 980/980) and retry. e2e evidence from foreground playwright runs registers fine.
3. Both renderers' full source was read this session; the plan's branch tables are accurate against `4408ed9` content. Trust the tables; verify with snapshots.
4. `detailSelect` (nbi-detail.js:508) reads global `activeDetailTaskId`; the plan's unified `detailSelectHtml` takes explicit taskId — output identical because `activeDetailTaskId === id` during builds. Both old helpers have ZERO callers outside the two builders (verified) — delete in Task 11.
5. Known pre-existing quirks to PRESERVE (also listed in plan): `detail-repeatFrequency`/`addRepeatDate_<id>` cross-panel ID collisions; overlay children colour keyed on `c.healthState === 'Blocked'` (never true); "-- Select a Initiative --" grammar; negative-hue `hsl(-30,...)` client badge colours. Byte-identical means these survive.

## Also pending (do not lose)

- **Task 15 has a GLEN GATE:** the overlay attachments entity-type fix. Two read-only prod queries quantify it (plan Task 15 Step 1); any migration (076) needs Glen's explicit approval BEFORE writing it.
- **Hierarchy e2e tests still unwritten** (configurable-hierarchy plan Task 12; carried from session C). Residual risk: hierarchy regressions invisible to `npm run test:e2e`. Add after the renderer work or as its own session.
- **Squash `snapshot:` commits before any push** (9+ cadence snapshots on master; Gate 5 blocks push). Carried forward.
- **CH director performance reviews** (Robin Jubber, Mustafa Sibai, Graeme Monk) — instructions in 2026-07-01 handoff (git history of this file).
- **Brain Delta: 6 corrections pending Glen adjudication since 2026-06-11** (CH title Fractional CPO, Lorenza spelling, CH headcount ~55 vs ~70, CH revenue GBP 360K actual, Dino departed 30 June, ClickUp wind-down). Mention once per session.
- `tmpcodex_plan_review.md` (project root) is uncommitted — raw Codex review, keep or delete at merge time.
- `scripts/cadence/state/routine_runs.json` modified in main checkout — cadence state, leave for cadence commits.

## Resume sequence

1. Read this handoff + `projects/nbi_dashboard/session_logs/2026-07-02_session_d.md` + the plan IN FULL.
2. Confirm worktree state: `git -C .worktrees/detail-renderer-unification log --oneline -3` → expect `2b2bf20` on top of `74c6290`; snapshot spec green (command above).
3. Dispatch Task 2 (mechanical `buildDetailOverlayHtml` extraction) — subagent, worktree, verify snapshot pass first-hand, check commit.
4. Tasks 3-10 one at a time, same loop. Task 3 has fully-worked code in the plan; 4-10 are branch-table transforms.
5. Task 11 (move inline renderer home) includes a full `npm test` gate. Then 12 (cache-busts), 13 (test:all + `codex review --base master` from the worktree, fix EVERY finding), 14 (merge via finishing-a-development-branch, `pm2 restart nbi-dashboard`, Playwright visual pass on BOTH panels, Glen UAT at https://worksage.nbi-consulting.com).
6. Task 15 last, with the Glen gate honoured.
7. Session log discipline throughout; handoff again at ~30% context.
