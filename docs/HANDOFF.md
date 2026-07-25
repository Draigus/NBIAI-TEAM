# Handoff -- 2026-07-25 (Monthly Costs rebuilt to Glen's cost model + visual-check regime installed; day-rate decision + Gantt styling + org chart REMAIN)

## What this session did (all COMMITTED, PUSHED, DEPLOYED to prod, VERIFIED)

Session start: resumed from 2026-07-24 handoff (Gantt redesign remaining). Glen UAT-drove ~6 fix rounds live. Every round: tests green, finish-task VERIFIED, deployed, pushed.

### Commits (chronological, all on master, all pushed to origin)
1. `17595dd` -- engine: unfilled roles cost ZERO until hired; hired roles' costs start the month AFTER start date (first payday). nextMonthKey helper.
2. `7c17810` -- Glen's cost model: weighting (employer on-costs NI/pension) is FTE-ONLY, one blanket % per client (fte_on_cost_pct); contractors NEVER weighted (loaded=base, overrides ignored); costs+export routes LEFT JOIN candidates.start_date AS actual_start_date (BST-safe formatting in route); frontend ?v=10: plain-English banner/KPI/sidebar copy ("fully weighted"/"base salary" vocabulary), matrix Approval cell click-to-edit (reuses inlineEditApproval), Start column shows recorded hire date, Settings modal = ONE FTE weighting field with explainer, role column 230->320px wrapping (c2 left:320, c3 left:432 in dashboard.css ~line 3613).
3. `43d6cca` -- engine sort: hired first (by real start month: actual||target), planned second (by target), denied last. Feeds matrix AND Excel export.
4. `429b1e0` -- KPI fix (FOUND BY VISUAL PASS): KPI cards summed UNHIRED roles' per-unit costs (showed GBP 91,750 vs GBP 43,571 actual hired). Now hired-only, hint "unfilled roles cost GBP 0 until hired". ?v=12. KPI regression e2e added.
5. `a64ac37` -- drag-to-reprioritise RESTORED on Roles card view (?v=11, before the KPI commit): old Positions view had it, Hiring Plan rebuild dropped it. hpCardDragStart/hpGroupDrop in nbi-hiring-plan.js PATCH via _hpPatchRole; empty tiers P0-P4 render as drop targets when caps.edit_requirement; CSS grab/ghost/highlight. E2E lesson: Chromium will NOT start native HTML5 drag if the gesture spans a scroll -- the drag e2e pins a 2000px-tall viewport.

### Production DATA changes (direct SQL, prod DB nbi_dashboard, CH client)
- employment_type -> 'contractor' for: Lead Animator, Level Design Lead, Lead Full Stack Developer, Snr Network Engineer (Glen's corrections) + Jira Admin Contractor, Mid QA Tester (Contract) (title-flagged in prior handoff; Glen told, no objection yet -- flip back if he says FTE).
- hiring_client_settings.fte_on_cost_pct = 26 for CH (Glen: "start it at 26%").

### Verified end state (evidence)
- Unit: full suite 109 files 1568/1568 (run bz31cl135); targeted hiring files 115-127 green each round. E2E hiring-plan.spec.js 26/26 (incl. drag both ways + KPI regression). finish-task VERIFIED each round.
- Live probe vs prod DB: 12 hired rows first (Technical Animator Mar-start pays from Apr GBP 3,680; Exec Producer GBP 14,375x1.26=18,113; contractors unweighted e.g. Lead Animator GBP 9,580), 18 planned rows all zero, 0 incomplete roles, no banner. Art Producer/Tech Producer use RECORDED candidate start dates (both July -> first pay Aug), sorted last within hired.
- Prod :8888 serving ?v=12 (curl). Orphaned PM2 workers killed after every restart this session: 4208, 48236, 35412 (known Windows PM2 bug -- ALWAYS sweep: pm2 jlist pids vs `Get-CimInstance Win32_Process` ProcessContainer node.exe).

### Visual-check regime (Glen directive 2026-07-25: "Playwright any time you change a core component with visual impact")
Installed in 3 layers, NOT YET COMMITTED (see Uncommitted below):
1. CLAUDE.md Section B "Verifying UI changes" extended with the interactive-visual-pass procedure (boot :8889 test stack with .env.test, seed via tests/helpers/fixtures.js, Playwright MCP login as seeded user, screenshot, LOOK, kill server).
2. Memory: feedback_visual_checks.md + MEMORY.md line.
3. Hook: `.claude/hooks/visual-impact-check.js` + PostToolUse Write|Edit entry in `.claude/settings.json` (command: node .claude/hooks/visual-impact-check.js). Pipe-tested (match/no-match/garbage all correct), settings validated (5 PostToolUse + 6 PreToolUse entries). PROOF-OF-FIRING NOT DONE -- successor: make any edit to a matching file and confirm the VISUAL-IMPACT EDIT context appears; if not, Glen opens /hooks once to reload config.
- DISCOVERY: the pre-existing "DASHBOARD EDIT DETECTED" hook in .claude/settings.json is SILENTLY DEAD -- it uses jq, which is NOT on PATH in the hook shell (`|| true` swallows it). Never fired all session. Successor should port it to node the same way or fold into visual-impact-check.js.

### Visual pass how-to (proven this session)
- Server: `PORT=8889 NODE_ENV=test DATABASE_URL=<from .env.test> node server.js` (background). Seed with tests/helpers (plain modules, work outside vitest; dotenv .env.test first). Login form is #loginUser/#loginPass -- createTestUser gives raw_password. changeHiringPlanClient('<uuid>') via browser_evaluate to select client. Playwright MCP screenshots land in REPO ROOT (cwd of MCP server); browser caches HTML -- add ?cb=N query to force reload after edits. KILL :8889 after (Get-NetTCPConnection -LocalPort 8889).

## Uncommitted work
Committed at close: CLAUDE.md, docs/HANDOFF.md, session log, decisions.md. NOTE: `.claude/settings.json` and `.claude/hooks/visual-impact-check.js` are GITIGNORED in this repo -- they exist on disk locally only (hooks run locally, so the regime works), but they are NOT in git. If they ever vanish, recreate from this handoff + session log. Stray `monthly-costs-visual-check.png` deleted. Other dirty files are OTHER sessions' residue (.agents/skills deletions, harness edits, news-aggregator, tmp_*.cjs) -- LEAVE THEM.

## Open with Glen (waiting on him)
1. **Day-rate divisor** -- he asked for a proper explanation; given in chat 2026-07-25 close-out: Day rate column = annual/12/WORKDAYS; dashboard uses 21, CH Decision #99 (Lili Zhao) uses 18 (GBP 80k -> 317/day vs 370/day). PROPOSED: per-client "workdays per month" field in Hiring Settings next to FTE weighting, CH set to 18, default 21. Await his answer; touches _fmtBudget daily maths (nbi-hiring-plan.js), engine daily basis (expected_workdays_per_month is PER-ROLE already -- the plan-table Day rate column is the separate 21-hardcode; grep `_fmtBudget` and `/12/21`), export.
2. Zeros on unfilled rows: Glen said "showing zeros is fine" -- NO work needed, decided.
3. Jira Admin Contractor + Mid QA employment flips: confirm he is happy (flagged to him, silence so far).

## Remaining work items (from 2026-07-24 handoff, still not started)
1. Gantt COLOUR/BAR styling of Monthly Costs (Glen's workbook concept: coloured bars; legend meanings UNKNOWN -- find v15 CH work plan Excel per memory project_couch_heroes_workplan or ask Glen ONLY the legend question). Sorting/zeroing/dates are DONE; only the visual bar treatment remains.
2. Settings modal self-explanation copy: on-costs section DONE this session; COO/FD mapping, recruiters, currencies, departments sections still bare (openHiringSettings ~line 1240 nbi-hiring-plan.js).
3. CH org chart deck restyle (CH brand colours from website + prior decks; tighten layout, fix rounded boxes) -- projects/couch_heroes/deliverables/2026-07-23-org-chart/.
4. Carried: COO/FD mapping from Glen; hiring_manager_user_id + requirement_type unset on all 30 CH rows; FX refresh wiring; 09:00 cron email failures (parked); worktrees .worktrees/hiring-plan-approval + fix-hiring-client-admin-controls cleanup after UAT.

## Resume sequence
1. Read this file + tail of projects/nbi_dashboard/session_logs/2026-07-24_session.md. Verify HEAD `429b1e0`+ (or later if commit-first done), compare running PM2 (prod 46736-ish/staging 4568-ish, RE-CHECK, sweep orphans), no vitest/node :8889 running.
2. Commit this session's uncommitted files (list above, explicit paths only), delete stray png, push.
3. Prove the visual-impact hook fires (edit any public/js file trivially, look for VISUAL-IMPACT EDIT context; revert). Port the dead jq hook to node.
4. Then: Glen's day-rate answer -> implement; Gantt bar styling (brainstorming + ui_ux_lead per prior handoff); settings copy; org chart.
5. EVERY visual change: the interactive Playwright pass per CLAUDE.md. It caught the KPI bug the suites missed -- it is not optional ceremony.
