# Handoff -- 2026-07-24 (Monthly Costs base-cost fix DEPLOYED; Glen rejected semantics/presentation; Gantt redesign + settings copy + org chart restyle REMAIN)

## What session was doing

Glen's UAT: "Monthly costs page is still all fucked up" (CH hiring plan). Diagnosed, fixed, converged with Codex (10 rounds), deployed to prod. Glen then rejected the RESULT on planning semantics and presentation and supplied a concept image (his CH planning workbook Gantt): coloured cost bars starting the month each person was hired/first paid. That redesign, plus a self-explanatory Settings page, plus a CH-brand restyle of the org chart deck, are the remaining work. Session ended at context threshold.

## Completed (deployed to production, live now)

- Root cause of the blank matrix: `hiring_client_settings` row missing for CH → engine nulled EVERYTHING including computable base costs. Fixed by decoupling base/loaded in `dashboard-server/lib/hiring-costs.js`: base cost (salary/12 → FX) always computes; only loaded is null when on-cost default unset. Per-row `incomplete_reasons` codes; totals gain `base_only_gbp_pence` arrays.
- `dashboard-server/migrations/086_hiring_settings_nullable_on_costs.sql`: pct columns nullable, DEFAULT 0 dropped. Applied + verified on BOTH DBs (prod `nbi_dashboard`, staging `nbi_dashboard_staging` — SEPARATE databases; see memory project_dashboard_db_topology). NOTE: migration comment wrongly says "shared prod/staging database" — wording error, operative fact (0 pre-086 rows in both) verified; never edit the committed migration.
- `dashboard-server/routes/hiring-plan.js`: costs response + `settings_configured`; GET settings returns null pcts + `configured` flag (no fabricated '0's).
- `dashboard-server/public/js/domains/nbi-hiring-plan.js` (?v=8): amber base figures in matrix/KPIs/plan table/sidebar, per-bucket total caveats, banner gated on rows Settings would actually fix, WYSIWYG settings save (blank clears ONLY when values readable — redaction-safe), legacy engagement mapping in _hpOnCostPct.
- `dashboard-server/lib/hiring-export.js`: Excel matrix amber base cells + legend; assumptions sheet "not set" not 0.
- Tests: +30 unit (hiring-costs 79, plan-costs, settings incl. clear-to-null), e2e journey test (unconfigured → banner/labels → save 18/15 → £7,080 appears).
- Codex convergence: 10 rounds, 10 findings fixed, 1 refuted with evidence (backfill moot: 0 settings rows in both DBs), round 10 explicit clean pass.
- Evidence: unit 1554/1554 (109 files), full e2e 145 passed/1 pre-existing skip, ats-workflow 9/9, finish-task.js VERIFIED (ALL SATISFIED), CH live-data probe: 28/30 roles base-costed (CTO £19,166.67/mo, combined £130,464.17/mo).
- Commits: `ac6ec6d` (fix, 10 files +829/-68) → merge `24c7b5a` → session log `fd0d358`. All pushed to origin/master.
- Deploys: staging + prod restarted, migration 086 in both out-logs, both serving `nbi-hiring-plan.js?v=8`, api/health 200. Orphaned workers killed: 29576, 45788. Legit workers at end: prod 4208, staging 64904, slack-bot 21604.
- Worktree `.worktrees/fix-monthly-costs-honesty` removed (node_modules junction rmdir'd FIRST — never recursive-delete a junctioned worktree), branch deleted. Stale `.git/worktrees/spa-modularise` ref would not prune (permission denied) — another session's, left alone.
- Two harness interventions logged (rejection of labels-not-numbers approach; rejection of deployed semantics/presentation + org chart colours).
- Memories updated: project_harness_evidence_cwd (quirk 4: worktrees can NEVER satisfy the verification gate — recorder writes to CLAUDE_PROJECT_DIR ledger with MAIN-repo fingerprints; run finish-task from main repo after merge), NEW project_dashboard_db_topology.

## Remaining (execution order)

1. **Monthly Costs Gantt redesign** (Glen's concept image, from his CH planning workbook — screenshot in this session ~07:4x): each role row = coloured horizontal bar across months; bar STARTS the month the person was hired and first paid (filled roles: actual start/first payment). Unhired roles: NO cost in months where nobody could have been paid (11 CH open/paused roles have PAST target starts and currently project costs from horizon month 1 — Glen: "roles that havent been hired that are listed with costs in that month... hot mess... not fit for view by anyone"). Colour semantics from his sheet: long green runs (hired), yellow segments (unknown — possibly pre-hire/recruiting or conversion phases), blue = fixed-term (AUDIO MENTOR 3-MONTH CONTRACT), red segments (unknown — possibly contract end/risk). **Do NOT guess the legend: check the v15 CH work plan Excel first** (memory project_couch_heroes_workplan; likely under Couch Heroes project dirs/OneDrive) and/or ask Glen ONLY for the colour meanings. Engine changes needed in lib/hiring-costs.js (planned-role start semantics: no cost before earliest plausible FUTURE month; decide with Glen or spec what "plausible" means), frontend bar rendering in renderHiringPlanMonthlyView. Spec reference: docs/superpowers/specs/2026-07-21-worksage-hiring-plan-design.md §Monthly cost matrix (line ~312: "Cells before the target start month are zero" — spec is SILENT on past-dated unhired roles; Glen's directive overrides).
2. **Settings modal self-explanation** — Glen: "the settings page doesnt explain what its trying to do so it makes no sense." Add plain-English purpose copy per section (on-costs: what they are, what they change; COO/FD mapping: who can approve/see financials; recruiters; currencies; departments). openHiringSettings in nbi-hiring-plan.js (~line 1130).
3. **CH org chart deck restyle** — Glen (interrupted msg): "its not CH themes in color scheme go look at the website and previous decks; its spread out too much and the rounded boxes of text isnt very well done or professional." Target: `projects/couch_heroes/deliverables/2026-07-23-org-chart/CH_Org_Chart_OnePage_2026-07-23.pptx` (+ 7-slide deck). Source CH brand colours from couchheroes website + previous CH decks (intelligence/banks/games_pitch_decks or CH project dirs). Tighten layout, replace rounded box treatment.
4. **CH on-cost source found** (intelligence/banks/client_couch_heroes.md, Decision #99, 2026-07-23): "Fully loaded employee cost for budget modelling agreed at 20-26% uplift above base (pension + NI, pre-benefits buildout); Jagex ~31% benchmark; day rate = annual / 12 / 18 working days per month; Lili Zhao (Head of Finance) building the headcount budget model." Present this to Glen and ask him to pick the exact %(s) per engagement type — do NOT silently apply a range midpoint. ALSO flag: Decision #99 says 18 working days/month for day rates; the hiring plan's earlier verified maths used 21 (day £317 = 80000/12/21) — Glen must confirm which convention the dashboard should use.
5. Carried forward: Glen to supply COO/Finance Director mapping (client-side visibility/approval); employment-type flips (Jira Admin, Mid QA stored fte, described contractor); hiring_manager_user_id + requirement_type unset on all 30 CH rows; FX refresh wiring (fx cron exists for expenses, wire hiring to it); 09:00 cron email failures (parked); worktree `.worktrees/hiring-plan-approval` + branch + `.worktrees/fix-hiring-client-admin-controls` cleanup after UAT.

## Decisions made this session

- Glen: costs must render from salary+hire date alone; on-cost is a refinement, not a gate ("the costs for the roles that are filled are already in there, and their hiring date is already in there").
- Glen (concept image): "the colored section are the amounts based on when they were hired and we first paid them" — Gantt-bar presentation anchored at first-payment month.
- Unset on-cost = NULL never fabricated 0 (migration 086); blank input = clear ONLY when user can read stored values (redaction-safe save).
- No backfill of pre-086 zeros: none exist (verified both DBs).
- Client admins may SET on-costs without financial read access (pinned by existing test; kept).

## Current state

- Branch: master
- Last commit: `fd0d358` "docs: session log for Monthly Costs base-cost fix + deploy" (pushed)
- Dirty files: other sessions' residue only — deleted `.agents/skills/**`, `.claude/harness/*` edits (their 27 tests pass), `decisions.md`, older session logs, news-aggregator files, `dashboard-server/tmp_match_receipts.cjs` + `tmp_upload_receipts.cjs` (untracked, another session's)
- PM2: nbi-dashboard 4208 (:8888), nbi-dashboard-staging 64904 (:8887), slack-bot, news, context-monitor, cloudflare-tunnel up; nbi-voice stopped (parked). EVERY pm2 restart orphans the old worker on this box — sweep with pm2 pid vs Win32_Process ProcessContainer.js after ANY restart.
- Test status: unit 1554/1554, e2e 145/1 skip — both at deployed HEAD.

## Verification state

Everything deployed is verified (named evidence above). NOT verified/not done: the three remaining work items (never started). Glen has NOT accepted the current page — it is live but rejected on semantics; no client users can see CH financials (no COO/FD mapped) so exposure is NBI-admin-only.

## Resume sequence

1. Read this file + tail of `projects/nbi_dashboard/session_logs/2026-07-24_session.md`.
2. Verify HEAD `fd0d358`, PM2 processes as listed, no orphaned ProcessContainer workers, no running vitest/codex.
3. Find the v15 CH work plan Excel (memory project_couch_heroes_workplan) and extract the Gantt colour legend; if absent, ask Glen ONLY the legend question.
4. Brainstorming skill for the Gantt redesign (it is creative/visual work; load ui_ux_lead role), then build: engine start-semantics first (TDD in lib/hiring-costs.js), then bar rendering, then settings copy. Worktree (>3 files) — but remember the gate lesson in project_harness_evidence_cwd quirk 4: final finish-task must run from MAIN repo after merge.
5. Org chart restyle after (or parallel session): CH brand colours from website + prior decks first, then rebuild layout.
6. Codex-converge, full suites, staging→prod deploy with per-DB migration checks, orphan sweep, UAT ask.
