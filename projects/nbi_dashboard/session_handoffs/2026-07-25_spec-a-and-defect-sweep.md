# Handoff -- 2026-07-25 (afternoon): Spec A built and verified; deferred defect list part-cleared; NOT committed, NOT deployed

Resumed from the overnight handoff at `410091c`. Glen made two decisions this session and then asked for the whole deferred defect list to be cleared before deploying. Spec A is complete and verified. The deferred list is roughly two-thirds done. **Nothing is committed and nothing is deployed.**

## Git state

- `HEAD` = `origin/master` = `410091c`. **No new commits this session.** Everything below is uncommitted working-tree changes.
- Changed (tracked): `dashboard-server/lib/hiring-export.js`, `dashboard-server/public/css/dashboard.css`, `dashboard-server/public/js/domains/nbi-hiring-plan.js`, `dashboard-server/routes/hiring-plan.js`, `dashboard-server/tests/e2e/hiring-plan.spec.js`, `dashboard-server/tests/unit/hiring-plan-export.test.mjs`, `dashboard-server/tests/unit/hiring-settings.test.mjs`, `nbi_project_dashboard.html`
- New (untracked): `dashboard-server/migrations/088_contractor_workdays_per_month.sql`
- **Delete before committing:** `dashboard-server/tmp_seed_visual.cjs` (my temp seed script), and `.playwright-mcp/before-plan-table.png`, `after-1.png`, `after-2.png`. `tmp_match_receipts.cjs` and `tmp_upload_receipts.cjs` are someone else's and predate this session.
- The rest of the dirty tree (~165 `.agents/skills/**` deletions, deliverable PNGs, other session logs) is other sessions' residue. Leave it.

## GLEN'S DECISIONS THIS SESSION

1. **Spec A: contractors only.** A day rate is a contractor's commercial term. Staff get no day rate at all.
2. **On loaded-versus-base:** "Contractors don't have any load beyond the base rate of the contract." He is right, and the question dissolves under Spec A. `lib/hiring-costs.js:142-144` already states contractors are never weighted, so on-cost is always zero on exactly the rows that now carry a day rate. My question was malformed; I should have read the engine before asking it.
3. **Clear the whole deferred defect list before deploying.** Not just the day-rate work.

## PART 1 -- Spec A. DONE and VERIFIED.

**Verification, named:**
- `npm test` (full unit suite): **109 files, 1584/1584 passing, 0 failures**, 2023s run. Run BEFORE the Part 2 changes below.
- `npx playwright test --config=tests/e2e/playwright.config.js hiring-plan.spec.js`: **29/29 passing**, including 3 new tests.
- Interactive Playwright visual pass on the :8889 test stack against an 11-role Couch Heroes-shaped fixture. Every day-rate figure checked by hand. Screenshots looked at, not just captured.

**Files and what changed**
- `migrations/088_contractor_workdays_per_month.sql` (NEW). Renames `default_workdays_per_month` to `contractor_workdays_per_month` inside a guarded `DO` block covering all three states (old column present, new column already present, neither, which is what a fresh DB from baseline hits). 087 was never deployed so no row ever carried a value; the rename cannot lose data. Drops BOTH the 087 and 088 constraint names so it is re-runnable.
- `routes/hiring-plan.js` -- key in the unconfigured settings object (~line 93), validation block (~line 130, 0.5 to 31 kept), `settable` list (~line 150).
- `public/js/domains/nbi-hiring-plan.js` -- `HP_DAY_RATE_TYPES` + `_hpHasDayRate`, `HP_STANDARD_WORKDAYS` 21 to **18**, `_hpWorkdaysFor`, `_hpWorkdaysBasisText`, `_hpWorkdaysTitle`, `_budgetInRate`, `_hpSortableGbp` (new), the day-rate table cell, the Budget cell fallback, the settings fieldset, `saveHiringSettings`, the sidebar Day rate row.
- `lib/hiring-export.js` -- `DAY_RATE_TYPES`/`hasDayRate`, `resolveWorkdays`, `dayRateFor`, `dayRateBasisFor`, Assumptions rows.

**Three judgement calls that go beyond the literal spec. All flagged to Glen at the time; all can be overturned.**

1. **The engagement set comes from the engine, not the handoff.** The handoff said `contractor` and `psc`. `lib/hiring-costs.js` uses `UNWEIGHTED_TYPES = contractor, contract, psc, freelance`, legacy spellings included. Mirrored that exact set in the frontend AND the export, so screen, workbook and cost engine cannot disagree about who is a contractor. A role with NO engagement type recorded gets no day rate and says so, because we do not know it is a contract and guessing is how a made-up number reaches a board pack.

2. **The gate went into the derivation, not just the column.** There is an annual/monthly/daily rate toggle at `nbi-hiring-plan.js:781` driving the Budget column. Gating only the Day rate column would have left the Daily setting stating a confident GBP 307/day in the Budget cell while the Day rate cell beside it showed a dash. Two adjacent cells answering the same question differently is the exact defect class the last two visual passes caught. Staff under Daily now read **"salaried, no day rate"**, deliberately distinct from "no salary on record", because the salary IS on record.

3. **FX went into the SORT, not the display.** The display already labels each figure with its own currency symbol, so it is not lying. The sort comparator was ranking raw numbers across currencies, so EUR 400 outranked GBP 390 while being worth less. `_hpSortableGbp` mirrors the engine: GBP fixed at 1, other currencies require their stored rate, a missing rate sorts with the unknowns rather than at face value. **I did not convert the displayed figures** -- doing so would have changed the Budget column too, which nobody asked for.

**Two tests failed first and both failures were correct.** `hiring-plan.spec.js:361` asserted an FTE showing GBP 198/day under the Daily toggle, obsolete by design. And my own new e2e caught a copy bug I had just written: `_hpWorkdaysBasisText` read "Based on the standard 18 days billable days per month" because the `days` variable already carried the word. Fixed to use `wd.days`.

**Visual pass results -- every figure checked against the client's own model:**

| Role | Engagement | Budget | Day rate | Weighted/mo |
|---|---|---|---|---|
| Contract VFX Artist (daily 575, 18 days on role) | Contractor | GBP 124,200/yr | GBP 575 | GBP 10,350 |
| Contract Backend Engineer (72,000) | Contractor | GBP 72,000/yr | **GBP 333** | GBP 6,000 |
| PSC QA Lead (monthly 7,200) | PSC | GBP 86,400/yr | GBP 400 | GBP 7,200 |
| Contract Server Engineer (EUR 84,000, fx 0.85) | Contractor | EUR 84,000/yr | EUR 389 | GBP 5,950 |
| Contract Tech Artist (daily 575, NO workdays) | Contractor | "needs working days" | GBP 575 | dash |
| Lead Gameplay Engineer (95,000) | FTE | GBP 95,000/yr | **dash** | GBP 9,816.67 |
| Unclassified Analyst (no engagement type) | (none) | GBP 55,000/yr | **dash** | GBP 4,583.33 |
| Community Manager (no salary) | FTE | "no salary on record" | dash | dash |

All correct. Contractors carry no on-cost, FTEs carry 24%, the daily-no-workdays row still refuses to invent an annual figure.

## PART 2 -- Deferred defect list. 9 of 10 done. e2e green, full unit suite NOT re-run.

**e2e after all Part 2 changes: 29/29 passing.** But everything in Part 2 was written AFTER the last green full `npm test` (1584/1584), and that suite has NOT been re-run. That is the outstanding verification gap.

### Done
1. **Pinned Role column.** `dashboard.css` -- `.hiring-plan-table th:first-child, td:first-child { position: sticky; left: 0 }` with explicit backgrounds (sticky cells are transparent) and a matching hover rule so the pinned cell highlights with its row. Mirrors the existing `.hiring-plan-matrix-sticky` pattern. **Verified live: `position: sticky` computed.**
2. **12px legibility sweep.** 11 CSS rules plus the inline `/yr /mo /day` suffix. Body-ish copy (`.hiring-plan-nosalary`, `.hiring-plan-cell--setup`, sidebar `.hp-sb-item .k`) to 14px; uppercase labels and badges to 13px. **Verified live.**
3. **Client selector.** `getContractedClientRecords()` derives from active WORK ITEMS, so a client with a hiring plan and no live project had no option and the selector read "Select a client..." over that client's financial data. Now the selected client is added back from `_apiClientsCache` (keyed by NAME, values carry `.id`, so it scans values). **Verified live: reads "Couch Heroes".**
4. **"Type" header renamed to "Requirement".** It renders `requirement_type` (New/Backfill) and read as a duplicate of Engagement. The sidebar already called it Requirement. **Verified live.**
5. **Settings-fetch provenance.** New `_hiringPlanSettingsFailed` flag. A failed fetch is no longer described as "Not set for this client" -- a new `source: 'unknown'` branch says the settings could not be loaded and to reload before relying on the rate. Cleared in `changeHiringPlanClient` so one client's dropped request cannot caption the next client's rates. **NOT verified -- needs a forced fetch failure.**
6. **Roles card budget fallback.** The card silently dropped the Budget row entirely; a role with missing data looked identical to one nobody had costed. Now carries the same three states as the table. **NOT verified visually -- the Roles view was not opened.**
7. **Print CSS.** New `@media print` block: releases `overflow:auto` on `.hiring-plan-table-wrap` (which was clipping every financial column off the page), releases the sticky Role column, unsets `white-space: nowrap`, repeats the header per page, avoids breaking inside a row, hides the segmented controls and client selector. **NOT verified -- no print preview was run.**
8. **Em dash sweep.** 13 prose em dashes in user-facing strings in `nbi-hiring-plan.js` plus 1 in `hiring-export.js` that shipped inside the client Excel workbook. The bare empty-cell glyph is left alone: it is a placeholder convention, not prose punctuation.
9. **Hiring manager column suppressed when empty.** Applies the rule already established for the Advertised column ("an all-dash column is noise") -- renders only when at least one role has a manager. On Couch Heroes, where `hiring_manager_user_id` is unset on all 30 rows, it was ~155px of dashes standing between the reader and the money. **Verified live: header count 12 matches row cell count 12, no misalignment.**

### NOT done
10. **Page-level disclosure of roles excluded from totals** ("N roles carrying GBP X of recorded rates are excluded"). Not started. The machinery exists at the on-cost notice (`noticeParts` around `nbi-hiring-plan.js:1383`) and needs extending. Matters from end of August when the whole CH contractor population moves to daily billing.

### THE HONEST PROBLEM WITH ITEM 1
**Pinning the Role column did not solve the problem it was meant to solve.** Measured at 1600x1100:
- Before anything: scrollWidth 1661 inside clientWidth 1273, overflow **388px**
- After the legibility sweep: 1793, overflow **520px** -- my own change made it WORSE
- After suppressing Hiring manager: 1637, overflow **364px**

Net 24px better than where it started. Budget, Day rate and Weighted/mo are STILL off the right-hand edge at a 1600px viewport. Pinning fixed "the Role label scrolls away when you scroll to the money"; it did not fix "the money is invisible". The overnight handoff's own suggestion was to then "consider a fourth view button, Finance" -- that is the fix that actually closes this item, and it is not built. **Do not report this item as closed.**

## First thing on resume

**e2e IS GREEN. This was resolved before the handoff closed and supersedes the earlier warning.**

The predicted breakage happened and was fixed. Removing the Hiring manager column shifted every positional column index, and `hiring-plan.spec.js:294` ("inline edits: priority, engagement, approval, then recruiting") failed on hard-coded `nth()` values: **28 passed, 1 failed**. Rather than re-hardcode the shifted numbers, that test now RESOLVES its column indices from the header row and asserts each one was found, so it cannot silently start checking the wrong column the next time a column learns to hide itself. Re-run: **29/29 passing (2.9m)**.

Remaining, in order:
1. **Re-run the FULL `npm test`.** The last green run (1584/1584) predates every Part 2 change. This is the outstanding verification gap.
2. Finish item 10 (excluded-roles disclosure).
3. Verify the three Part 2 items that are written but unverified: print CSS (needs a print preview), the settings-fetch flag (needs a forced fetch failure), the Roles card fallback (that view was never opened).
4. A final interactive visual pass covering the Roles card view and the print preview.

## Codex -- STILL NO ADVERSARIAL REVIEW. Second consecutive session.

The parallel session's `codex review --commit 603cbfa` was running when I resumed and **died at 13:56** with:
```
windows sandbox: orchestrator_helper_exit_nonzero: setup helper exited with status Some(143)
```
`tmpcodex_review_603cbfa.md` ends mid-tool-call at 632KB with no findings JSON, no verdict, no priority list. Checked; nothing usable in it.

The CLI version problem from the last handoff IS fixed (0.145.0). The blocker is now the Windows sandbox. **No cross-AI adversarial review exists for `7a27e84`, `603cbfa`, or any of this session's work.** No Claude self-review was substituted. This is a mandatory gate under CLAUDE.md for multi-file changes on a non-Fable model, and it is unmet.

Orphaned `codex` processes from earlier failed runs: pids 44292 (21 Jul), 44036 (01:32 today), 73100 (04:58 today). None is live. Safe to kill.

## Environment state at handoff

- **:8889 test server may STILL BE RUNNING.** Started with `export $(grep -E '^DATABASE_URL=' .env.test | xargs)` then `node server.js`, confirmed on `nbi_dashboard_test` from the startup log. **Kill it on resume.**
- The e2e run in flight will have truncated and reseeded the test DB, so the visual fixture is gone. Re-run `node tmp_seed_visual.cjs` from `dashboard-server/` to recreate it (login `visualadmin` / `visual_pass_123`).
- PM2 untouched: prod `nbi-dashboard` pid 54000 (30 restarts), staging pid 4568, both online. Prod still serves `?v=12` and has seen neither 087 nor 088.
- Cache params now: `dashboard.css?v=20`, `nbi-hiring-plan.js?v=20`.

**Test-stack gotcha, corrected from the last handoff.** The previous note blamed dotenvx overriding `.env`. Wrong diagnosis: `server.js:32` uses plain `dotenv`, which does NOT override existing process env. My first boot failed because I GUESSED the password. Take `DATABASE_URL` verbatim from `.env.test` and confirm `"db":"...nbi_dashboard_test"` plus `Migration: All migrations already applied` in the startup log before letting a browser near it.

## Still to do after the above

1. Codex adversarial review, twice clean (non-Fable tier), or an explicit decision from Glen to ship without it.
2. Commit. One commit for Spec A + 088, one for the defect sweep.
3. **Set Couch Heroes `contractor_workdays_per_month` to 18.** Their own figure, from both sides of their own model. Currently UNSET, so the standard 18 applies anyway; setting it makes the provenance read "set for this client" instead of "not set".
4. Deploy staging-first: `pm2 restart nbi-dashboard-staging`, confirm "Applied migration 088" in the staging log, e2e against staging, then `pm2 restart nbi-dashboard`, confirm the migration line, curl for `?v=20`.
5. **PM2 orphan sweep only when the sibling's start time PREDATES the most recent deploy.** Checked this session: prod's tracked pid 54000 and untracked sibling 60636 both started 04:33:20, same generation, so no sweep.

## Carried, untouched this session

- Gantt colour/bar styling of Monthly Costs. Legend meanings still unknown; find the v15 CH work plan Excel or ask Glen.
- CH org chart deck restyle at `projects/couch_heroes/deliverables/2026-07-23-org-chart/`.
- Settings modal copy: COO/FD mapping, recruiters and currencies sections still bare.
- COO/FD mapping from Glen; `hiring_manager_user_id` and `requirement_type` unset on all 30 CH rows; FX refresh wiring; 09:00 cron email failures (parked); worktree cleanup for `.worktrees/hiring-plan-approval` and `fix-hiring-client-admin-controls`.

## Open with Glen

1. **The Finance view button.** Pinning the Role column did not make the money visible. Fourth view button alongside Plan / Roles / Monthly Costs, or a different approach (column chooser, dropping more low-value columns, horizontal compression)?
2. Codex cannot run. Ship without adversarial review, or fix the sandbox first?
3. Jira Admin Contractor and Mid QA employment-type flips: still no answer.
4. Gantt legend meanings.

## Method lessons worth keeping

- **I asked Glen a malformed question.** The loaded-versus-base answer was already written in `hiring-costs.js`. Read the engine before putting a design question to him.
- **The spec named two render sites; there were three.** The rate toggle was only found by grepping every caller of `_budgetInRate`. Grep all consumers before gating a function.
- **My own e2e assertion caught a copy bug I had just written.** Write the assertion against the intended copy, not against what the code happens to produce.
- **A legibility fix can make a layout fix worse.** The font sweep added 132px to a table already 388px too wide. Measure the interaction; improvements do not automatically compose.
