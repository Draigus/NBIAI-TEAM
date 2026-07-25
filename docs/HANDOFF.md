# Handoff -- 2026-07-25 (overnight run: hooks fixed, harness landed, day-rate basis built and reviewed; deploy and two design workstreams REMAIN)

Glen's instruction for the run: "Complete all this work. Verify it. Write it. Have a Couch Heroes Executive review it. Be very stringent on quality. As a UI/UX designer, assess it as a head of finance. Make sure it has the detail that I need and that it is correct and readable." He then went to bed. Every judgement call below was made by me and is stated with its reasoning so it can be overturned.

## Commits this run (all on master)

1. `1e5e446` -- harness: landed the verification-gate hardening batch that had sat uncommitted since 2026-07-23 with source and runtime diverged.
2. `7a27e84` -- feat(hiring-plan): per-client working-days basis for day rates.
3. `603cbfa` -- fix(hiring-plan): defects found by the two reviews.
4. `e29d2ce`, `9235ce3`, `88067eb` -- this handoff and the session log.

All pushed; `origin/master` is at `88067eb`. The working tree carries only other sessions' residue plus `tmpcodex_review_603cbfa.md`.

**Full verification at close:** unit suite 109 files, 1583/1583 passing (a 19-minute run). e2e hiring-plan 26/26. Harness 318 assertions across the six tests covering the batch.

## GLEN'S DECISION -- build this first, then deploy everything together

Two messages, and the SECOND one supersedes the first.

**First he chose:** two divisors, staff 21.75 and contractors 18.

**Then he said: "Im not sure fte even need day rates only contractors."**

**He is very likely right, and this is the better design.** A day rate for a salaried employee is a derived curiosity: nobody pays an employee by the day, so the number has no commercial meaning and its divisor is arguable, which is exactly the argument that consumed this whole thread. A contractor day rate is the actual commercial term on the contract. Restrict the column to contractors and the ambiguity disappears rather than being settled.

**The one case where an FTE day rate genuinely matters, which must be checked with Glen before building:** hire-versus-contract comparison. "Do we take this person on staff or engage a contractor for it?" is a real question, and the CH material frames the correct comparison as contractor base rate against FTE base plus the 20-26% on-costs. If that comparison is wanted in this product, an FTE day rate has to exist, must use 21.75, and must be the LOADED figure, not base. If that comparison lives outside this product, staff day rates should simply not be shown.

**So the first job on resume is one question to Glen:** does the hiring plan need to answer "staff or contractor for this role", or is the day rate purely a contractor commercial term? Then build ONE of the two specs below.

### SPEC A -- contractors only (Glen's latest steer, build this unless he says otherwise)

- Day rate column and the sidebar Day rate row render a figure **only** where `employment_type` is `contractor` or `psc`. For `fte`, render a dash with a hover reading "Day rates apply to contractors. Staff are paid an annual salary."
- **One** client setting, not two: rename `default_workdays_per_month` to `contractor_workdays_per_month` in migration 088. Standard fallback **18** (216 billable days a year / 12), stated on screen.
- `HP_STANDARD_WORKDAYS` becomes 18 and every copy string mentioning "the standard 21" changes with it.
- This DELETES the 21.75 problem, deletes the FTE half of the settings UI, and makes the existing e2e assertion at `hiring-plan.spec.js:592` (an FTE on 72,000 expecting a day rate) obsolete rather than merely wrong. That test needs rewriting against a contractor.
- Simpler than Spec B in every respect. Prefer it.

### SPEC B -- both populations (only if Glen wants hire-versus-contract in this product)

Two divisors: staff **21.75** (261 weekdays / 12, because an employee is paid whether or not they take holiday), contractors **18** (216 billable days / 12). On GBP 80,000 that is GBP 307/day staff against GBP 370/day contractor. If built, the staff figure should also be loaded with `fte_on_cost_pct` or the comparison it exists to serve is invalid.

### Build spec, applies to whichever is chosen

**Migration 088.** Do NOT edit 087, it is committed and pushed.
- Rename `default_workdays_per_month` to `contractor_workdays_per_month` (Spec A) or to `fte_workdays_per_month` plus a new `contractor_workdays_per_month` (Spec B). Guard the rename in a `DO` block against `information_schema.columns` so re-running is safe. No prod row has ever carried a value (087 is not deployed), so nothing is lost either way.
- NULL-able, `CHECK (x IS NULL OR x > 0)`, no materialised DEFAULT. Same reasoning as 086 and 087: a default that materialises reads as a deliberate setting.

**`_hpWorkdaysFor(r)`** in `dashboard-server/public/js/domains/nbi-hiring-plan.js` -- resolution becomes: the role's own `expected_workdays_per_month`, then the client setting, then the standard. Under Spec B it must branch on `r.employment_type` (canonical since migration 085: `fte`, `contractor`, `psc`). Under either spec, decide and state in the copy which side `psc` falls on -- it bills like a contractor, so 18.

**`resolveWorkdays(role, settings)`** in `dashboard-server/lib/hiring-export.js` must branch identically. These two functions are a deliberate mirror; if they drift, the workbook and the screen state different bases for the same role.

**Settings modal** -- under Spec A the existing single box just gets relabelled "Contractor working days per month" and the explainer rewritten to say day rates are a contractor term. Under Spec B it becomes two boxes. Either way keep the live worked example.

**Route** `dashboard-server/routes/hiring-plan.js` -- update the key(s) in `settable` (~line 150), the validation block (~line 130, keep the 0.5 to 31 range), and the unconfigured settings object (~line 93).

**Tests** -- update the `default_workdays_per_month` describe block in `tests/unit/hiring-settings.test.mjs` and the export test asserting Day Rate Basis. **The existing e2e at `hiring-plan.spec.js:592` asserts an FTE on 72,000 shows GBP 286/day (72,000/12/21). Under Spec A that role should show no day rate at all, so the test must be rewritten against a contractor. It WILL fail until then, and that failure is correct.**

**Then set Couch Heroes:** contractors 18, which is their own stated figure. Under Spec A there is nothing to set for staff.

### After that is built and green

1. Interactive visual pass per CLAUDE.md. It has caught something the suites missed in two consecutive sessions.
2. `codex review` on the whole range -- the CLI is now fixed (see below).
3. **Deploy.** Glen: "as soon as we work out remaining then we need to deploy." Staging first, sequence below.

## Codex -- FIXED

The CLI was 0.137.0, too old for its own default model ("gpt-5.6-sol requires a newer version of Codex"). Upgraded to **0.145.0** via `npm i -g @openai/codex@latest`, and `codex review` now starts and works properly.

**But there is still NO CODEX VERDICT on any of this work.** A review of `603cbfa` ran for the full 900-second timeout I gave it and was killed mid-investigation. `tmpcodex_review_603cbfa.md` in the repo root contains its working transcript, NOT findings. Do not mistake it for a clean pass.

Give it a much longer timeout, or run `codex review --commit <sha>` in a terminal without one. Reviews of this codebase take a long time because Codex greps broadly and this repo is large.

**Where it had got to when it died is worth knowing, because it was pointed at the right risk.** It was building a workbook via `buildHiringPlanWorkbook` with a monthly role carrying `expected_workdays_per_month: 20` and a daily role carrying 18, against a client default of 21, to check what the export's Day Rate and Day Rate Basis columns produce. That is precisely the drift risk between `resolveWorkdays` in `lib/hiring-export.js` and `_hpWorkdaysFor` in `public/js/domains/nbi-hiring-plan.js`. If Codex cannot be made to finish, write that check as a unit test by hand -- it is a good test regardless.

Still to review: `7a27e84`, `603cbfa`, and whatever 088 becomes.

## 1. Hooks -- DONE

**The dead jq hook is confirmed dead and now fixed.** `jq` does not exist anywhere on this machine: absent from the Git Bash PATH, the PowerShell PATH, and every common install location on disk. The `DASHBOARD EDIT DETECTED` hook piped stdin to jq and swallowed the failure with `|| true`, so it produced output exactly zero times since it was written. `python3` DOES exist and runs, so the three PreToolUse guards that depend on it are alive and were verified firing.

Ported into `.claude/hooks/visual-impact-check.js`, which now carries two guards: render-shaping files (`public/js`, `public/css`, `nbi_project_dashboard.html`) get the visual-pass reminder; any other `dashboard-server/` file gets the dashboard-health reminder. Removed the dead entry from `.claude/settings.json` (5 PostToolUse entries down to 4, no jq references remain, JSON validates).

**Deliberate behaviour change:** the old hook had a `decision: block` branch when :8888 was down. Not carried over. Blocking edits because prod is down would stop you fixing prod, which is exactly when you need to edit. It never once fired, so no working behaviour was lost.

**PROOF OF FIRING ACHIEVED** -- the thing the last handoff listed as outstanding. Both branches fired live in-session: `VISUAL-IMPACT EDIT` on every edit to `nbi-hiring-plan.js` and `nbi_project_dashboard.html`, `DASHBOARD EDIT` on every edit to `lib/hiring-export.js` and `routes/hiring-plan.js`. No `/hooks` reload was needed in the end.

Test matrix lives at the session scratchpad `hooktest.js`: 15/15 across Windows absolute, POSIX absolute, relative, uppercase, server-file and non-matching paths, plus four junk payloads that must stay silent. **Note both files are gitignored** and exist on disk only, as the previous handoff warned.

**A method lesson worth keeping.** I first reported the visual-impact hook as "confirmed and reproducible" broken on Windows paths. It was not. `printf` had collapsed the doubled backslashes in my test payload, so the hook received invalid JSON and correctly stayed silent. I stated a false conclusion before checking my own test harness. Rebuilt with `JSON.stringify` and everything passed. Verify the harness before believing the failure.

## 2. Harness batch -- DONE, deployed

650 insertions / 123 deletions across `command-detector.js`, `git-push.js`, `verification-gate.js` and two test files. Ran the six harness tests covering them: command-detector 55, hook-misfire-regression 157, verification-gate 24, verification-posthook 19, verification-resolver 12, verification-state 51. **318 assertions green.** Committed, deployed via `.claude/harness/deploy.js`, md5-verified source and runtime now byte-identical on all three lib files. The gates that blocked two of my commits tonight were the newly deployed ones doing their job.

`deploy.js` is at `.claude/harness/deploy.js`, NOT `.claude/harness/lib/deploy.js`.

## 3. Day rate -- BUILT AND REVIEWED, NOT DEPLOYED

### The decision I made, and why

Glen rejected the internal shorthand outright: "You're referring to some numerical naming convention, such as Decision 99, which is literally fucking killing me. I have no context for what that is." Correction taken: state facts, not bank entry numbers. He delegated the call.

Verified from source, and the evidence is stronger than the previous handoff claimed. Two independent derivations in the Couch Heroes material converge on 18:
- Their fully-loaded cost model states "day rate = annual / 12 / 18 working days per month" -- agreed, not assumed.
- Their July 2026 IR35 contractor reform derives 260 working days less 36 vacation less 8 sick = 216 billable a year, with a 20-day monthly soft cap and 18 expected average. 216/12 = 18.

The dashboard's invisible 21 contradicted the client's own paperwork by 17% on an GBP 80,000 salary (GBP 317/day shown against GBP 370/day in their model).

**Design chosen:** 21 stays the global default but becomes VISIBLE and OVERRIDABLE instead of a buried literal. New per-client `default_workdays_per_month`. Resolution order: the role's own figure, then the client's setting, then the standard 21. Every row states which one it used.

**The most important scope limit:** the client default feeds the DISPLAYED day rate only, never the cost engine. A daily-basis role with no workdays stays flagged `missing_workdays` and stays out of the totals. Filling that from a client default would turn an incomplete row into a confident-looking cost resting on an assumption, which is the exact failure mode migration 086 was written to stop.

Distinct from the 20 workdays/month in the production bank, which is a CAPACITY baseline (how much work a person delivers), not a cost divisor. Do not conflate them.

### Files
- `dashboard-server/migrations/087_hiring_settings_default_workdays.sql` -- NULL means unset, no materialised DEFAULT, CHECK strictly positive.
- `dashboard-server/routes/hiring-plan.js` -- default in the unconfigured settings object (~line 93), validation (~line 130), `settable` list (~line 150).
- `dashboard-server/public/js/domains/nbi-hiring-plan.js` -- `HP_STANDARD_WORKDAYS`, `_hpWorkdaysFor`, `_hpWorkdaysBasisText`, `_hpWorkdaysTitle`, `_hpCanDeriveFromDaily`, `_budgetInRate`, the day-rate table cell, the sidebar Day rate row, the Working Days per Month and Departments fieldsets in `openHiringSettings`, and `saveHiringSettings`.
- `dashboard-server/lib/hiring-export.js` -- `resolveWorkdays`, `dayRateFor`, `dayRateBasisFor`, Day Rate and Day Rate Basis columns, Assumptions rows.
- `nbi_project_dashboard.html` -- cache param now `?v=17`.

### Three defects the interactive visual pass caught that every green suite missed
1. A contractor on GBP 575/day with no workdays recorded displayed a confident GBP 144,900/yr budget while its Weighted/mo showed a dash, because the engine correctly refused to cost it. The table was inventing an annual figure excluded from every total on the same page.
2. That row then read "no salary on record", which is false. It has a rate on record; it lacks working days. Now "needs working days".
3. The hover text appended the formula even where no division occurred.

Plus both settings inputs rendered raw `NUMERIC(14,4)` as "26.0000" and "18.0000".

This is the second consecutive session where the interactive pass caught something the suites did not. It is not ceremony.

## What the reviews found

Two reviews were run as Glen asked. **Both full reviews are worth reading in the session transcript; the material findings are here.**

### Codex adversarial review -- DID NOT RUN. This is a real gap.
`codex review` fails: its default model `gpt-5.6-sol` requires a newer Codex CLI than the one installed ("requires a newer version of Codex. Please upgrade"). Pinned to `gpt-5.5` with `-c model=`, it ran for nine minutes without producing a verdict and timed out. **No cross-AI adversarial review of this work exists.** I did not substitute a Claude self-review. Fix the CLI (`npm i -g @openai/codex@latest`) and run `codex review --commit 7a27e84` plus the review-fix commit.

### Fixed in the review-fix commit
- **The tooltip was still lying in two of four basis combinations.** Both reviewers found it independently; I verified it in the source before acting. `_budgetInRate` computes `monthly/workdays` for a monthly basis (no division by 12) and `amount*workdays/workdays` for a daily basis with role workdays (no division at all), yet the tooltip asserted the annual formula for both. The same defect the previous commit claimed to fix, surviving in half the cases.
- Em dashes in every string this work introduced, including one shipping inside the client Excel workbook. Glen's hard rule.
- The settings copy overclaimed: it said the setting "never changes the monthly cost totals". True of the client default, but the ROLE-level workdays field DOES feed totals for daily roles. Copy now distinguishes the two fields.
- Excel Day Rate and Day Rate Basis columns. The Assumptions sheet documented a formula for a figure the workbook did not contain, and stated the client divisor as a blanket fact while roles may override it.
- Validation floor aligned at 0.5 across input, client and server (the toast promised 0.5, the code accepted anything above 0, so 0.25 saved).
- Hover no longer asserts a basis on empty cells; `aria-label` added.
- Sidebar caption moved off 12px bold muted onto 14px normal.

### NOT fixed -- deliberate, needs Glen or needs design work

**The substantive open question, and why I did not set Couch Heroes to 18 in production.**
The CH executive review made an argument I could not dismiss: 21 and 18 are not two opinions about one quantity. 21 (261 weekdays / 12) is gross calendar weekdays with no leave deducted. 18 is net billable days after 44 days of leave. For an FTE, who is paid across all twelve months whether or not they take leave, the cost-per-day-of-attendance divisor genuinely is around 21.75, and 18 overstates it by roughly 17%. For a contractor billing only worked days, 18 is correct. `_hpWorkdaysFor` applies ONE client-wide divisor to both populations.

So setting CH to 18 would make contractor rates right and arguably make FTE rates wrong, in the opposite direction from today. **I built the mechanism and left CH's value UNSET**, which leaves current behaviour unchanged at 21 but now labelled honestly. Glen's call:
- (a) set 18 client-wide, accepting the FTE overstatement, or
- (b) split the setting into an FTE divisor and a contractor divisor, or
- (c) set 21.75 for FTE and leave contractors on their per-role figures.
My recommendation is (b) -- it is the only option that is correct for both populations, and the field already resolves per role so the plumbing is half built.

**Also raised and not actioned:**
- Day rates are UNLOADED base, sitting next to a loaded, GBP-converted Weighted/mo. GBP 370 x 18 = GBP 6,660 next to a Weighted/mo of roughly GBP 8,400. Anyone reading a board pack multiplies two adjacent cells and finds they do not tie. Either load the day rate or label the column "base".
- No FX. `_budgetInRate` never applies `fx_rate_to_gbp`, so the Day rate column mixes currencies and the sort comparator ranks raw numbers across them.
- **The finance columns are off-screen.** At 1600x1100 the table scroller is 1658px inside a 1273px viewport, so a finance user sees none of Budget, Day rate or Weighted/mo without scrolling, and when they do scroll the Role column scrolls away with everything else. The single highest-value fix is pinning the Role column with `position: sticky; left: 0`. Then consider a fourth view button, `Finance`, alongside Plan / Roles / Monthly Costs.
- The `Type` column renders `requirement_type` (New/Backfill) but is headed "Type", which reads as a duplicate of Engagement. The sidebar calls the same field "Requirement". Rename the header.
- Print CSS clips every financial column (`.hiring-plan-table-wrap` is `overflow:auto` and is not in the print reset), and `@media print` hides the sidebar. **There is currently no printable evidence of the day-rate basis anywhere in the product.**
- The client selector shows "Select a client..." while a client's data is displayed, because it is built from `getContractedClientRecords()` and a client with a hiring plan but no active work item has no matching option. Financial data attributed to nobody.
- If the settings fetch fails, `_hiringPlanSettings` stays null, day rates silently revert to 21, and the label asserts "not set for this client" -- a provenance feature that can assert a false provenance.
- Save always fires a PATCH: the blank field assigns `null`, so `body` is never empty and "No changes to save" is unreachable.
- The Roles card view has no fallback for a missing budget where the table now has two.
- A page-level disclosure of roles excluded from totals ("N roles carrying GBP X of recorded rates are excluded") -- the machinery exists at the on-cost notice and was not extended. This matters from end of August when the whole CH contractor population moves to daily billing.
- 12px is doing load-bearing work in six places against Glen's 14-15px body rule (table headers, `.hiring-plan-nosalary`, the `/yr` `/mo` `/day` unit suffix, sidebar keys and section headings). Needs a CSS sweep and its own visual pass.
- Pre-existing em dashes elsewhere in `nbi-hiring-plan.js` and `hiring-export.js` were left; they need a sweep of their own.

## Deploy -- NOT DONE, and why

Nothing has been deployed. Prod still serves `?v=12` and has not seen migration 087.

I stopped short deliberately. Deploying means restarting prod to apply 087, and the day-rate work changes numbers a client reads. With a substantive unresolved question about whether 18 is right for FTEs, and no completed adversarial review, pushing that to production while Glen slept was not a call I was willing to make on his behalf. The code is committed, tested and safe to deploy whenever he says.

**When deploying, follow the staging-first sequence:** `pm2 restart nbi-dashboard-staging`, confirm "Applied migration 087" in the staging log, run e2e against staging, then `pm2 restart nbi-dashboard`, confirm the migration line, then curl for `?v=17`.

**PM2 orphan sweep -- correction to the previous handoff.** That handoff said to ALWAYS sweep untracked `ProcessContainer` processes. I did, and it bounced production: killing pids 46736 and 12488 took prod's restart count from 28 to 30 and moved its pid. Prod recovered by itself and was verified healthy, but the restart was avoidable. **Sweep only when the sibling's start time PREDATES the most recent deploy** (genuine stale code). A same-generation sibling costs a production restart and buys nothing.

**Test-stack safety note.** `node -r dotenv/config server.js dotenv_config_path=.env.test` did NOT reliably bind the test env and left a server running I could not confirm was pointed at the test database. Kill by port and restart with explicit inline env vars, then CONFIRM the database from the startup log before letting a browser near it. A click on a UI backed by the prod DB writes to prod.

## Remaining work items, not started

1. **Gantt colour/bar styling of Monthly Costs.** Sorting, zeroing and dates are done; only the visual bar treatment remains. Legend meanings still unknown -- find the v15 CH work plan Excel or ask Glen that one question.
2. **CH org chart deck restyle** -- `projects/couch_heroes/deliverables/2026-07-23-org-chart/`. CH brand colours from their website and prior decks, tighten layout, fix rounded boxes.
3. Settings modal copy: Working Days and Departments now have explainers. COO/FD mapping, recruiters and currencies sections are still bare.
4. Carried: COO/FD mapping from Glen; `hiring_manager_user_id` and `requirement_type` unset on all 30 CH rows; FX refresh wiring; 09:00 cron email failures (parked); worktree cleanup for `.worktrees/hiring-plan-approval` and `fix-hiring-client-admin-controls`.

## Open with Glen

1. **The 18-vs-21.75 FTE question above.** This is the one that matters and it blocks setting CH's value.
2. Whether the day rate column should be loaded or relabelled "base", given it sits beside a loaded Weighted/mo.
3. Jira Admin Contractor and Mid QA employment-type flips: still no answer.
4. Gantt legend meanings.
5. Codex CLI needs upgrading before any further cross-AI review is possible.
