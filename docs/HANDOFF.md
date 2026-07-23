# Handoff -- 2026-07-23 (Fable spec-parity sweep COMMITTED + DEPLOYED; awaiting Glen UAT)

## State right now

- Master at `4900434` ("fix: hiring plan spec-parity sweep") pushed to origin. Predecessor `d5b4602` (4.6's sweep commit, same day).
- Production (:8888, PM2 pid 29576) and staging (:8887, pid 30128) both restarted on `4900434`, both serving `dashboard.css?v=19`, `nbi-hiring.js?v=31`, `nbi-hiring-plan.js?v=7`. 20/20 route probes 401 (auth-gated, no stale workers). Error log clean apart from the known 09:00 cron email failures (parked, pre-existing).
- Orphaned PM2 cluster workers killed this session: 43728, 14472, 67948. EVERY `pm2 restart` on this box orphans the old worker — always check `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` for ProcessContainer.js PIDs not in `pm2 jlist` after restarting (memory: project_pm2_orphaned_workers).
- Glen has NOT UAT-accepted. Session log: `projects/nbi_dashboard/session_logs/2026-07-23_session.md` (committed; also contains entries from two parallel Fable sessions: RACI doc + CH org chart).

## What this session did

Glen flagged that the morning resume session ran on Opus 4.6 (harness intervention emitted, existing_rule_missed: feedback_no_opus_47.md) and directed a full Fable re-verification against the approved mockup (`docs/superpowers/mockups/hiring-plan-mockup.html`) and design spec (`docs/superpowers/specs/2026-07-21-worksage-hiring-plan-design.md`), plus a day-rate column.

1. **4.6's morning commit d5b4602 reviewed**: gantt timeline fix correct; hiring changes correct but incomplete vs spec.
2. **Server bugs fixed** (`routes/hiring-plan.js`): settings PATCH fake transaction (pool.query BEGIN/COMMIT → dedicated client); approve no longer force-starts recruiting (spec 7; unit test that encoded the bug rewritten); /recruiting rejects non-approved roles; /history endpoint client-scope check (was cross-client readable); plan GET joins client_name + filled_by_candidate_name.
3. **Plan table rebuilt to mockup columns**: Role+dept, Priority, Start, Type (New/Backfill), Approval, Hiring manager, Days open, Recruiting, Engagement, Pipeline (stage counts, click → Pipeline tab filtered to role), then Advertised range (only when data exists), Budget (rate seg), **Day rate (Glen's directive, directly in front of Loaded/mo)**, Loaded/mo.
4. **Sidebar extended per spec 9** (into existing position panel, `nbi-hiring.js` openPositionDetail): planning details, comp & cost assumptions (advertised/budget/day rate/FX + source/applied on-cost/monthly loaded), Approve/Deny for pending roles, denial box, immutable history timeline (wired the dead /history endpoint), candidate stage bar. Header badge fixed (showed "Open" on filled roles — tested p.status==='filled' which never occurs).
5. **Matrix**: sticky Role/Approval/Start columns, dept·eng·currency subtitle, per-row + per-bucket Horizon total column, "Total Pending"/"Combined Total" labels.
6. **Roles cards**: closed roles hidden from priority groups by default + "Show N closed roles" toggle (Glen mid-session directive: "why do the cards show up when the roles are closed... in the priorities"); manager in dept line; New/Backfill chip.
7. **Filters/search**: Recruiting + Priority filters added; search covers title/description/department/manager; focus no longer lost per keystroke. Recruiting "Not started" renders as dash on non-approved roles (spec: recruiting starts only after approval).

## Verification (named evidence)

- Unit: **1529/1529** (109 files, full suite foreground ~30min). Hiring files specifically 96/96 after fixes.
- E2E hiring-plan.spec.js: **23/23** (17 updated for new column order; 6 new mockup-parity tests: day-rate position+conversion, closed-card toggle, new filters, sidebar sections + sidebar approve + history, chip navigation, matrix sticky/horizon).
- E2E regression: ats-workflow 9/9 (its hardcoded `nbi-hiring.js?v=30` pin bumped to 31), onboarding-wizard + timeline-sort green.
- Visual: 4 screenshots (plan/sidebar/cards/matrix, 1680px, mockup-like seed) inspected against the mockup; maths spot-checked (day £317=80000/12/21; loaded £7,866.67=80000/12×1.18; contractor matrix £9,923=450×21×1.05). Temp spec deleted.
- `node .claude/harness/lib/finish-task.js`: **VERIFIED**.
- E2E infra reminder: ALWAYS `npm run test:e2e -- -- <spec>`; bare `npx playwright test` resolves a broken npx-cache copy.

## Open items (priority order)

1. **Glen UAT** (Ctrl+F5 at https://worksage.nbi-consulting.com → Hiring → Hiring Plan): new columns incl. Day rate, sidebar sections on a CH role (planning/costs/history), pipeline chips (106 CH candidates linked), Roles view closed-toggle (12 filled roles hidden from priority groups), matrix sticky cols + horizon totals, Projects → Timeline sort.
2. **CH hiring_client_settings row MISSING** (verified in prod DB): on-cost falls back to 0% (loaded=base for CH), nobody mapped as COO/Finance Director (so CH client users see no financials; Aris can't approve in-app). Need from Glen: CH on-cost %s + who maps to COO/Finance. One Settings-modal entry once known.
3. **Employment-type flips awaiting Glen**: Jira Admin Contractor + Mid QA Tester stored fte, descriptions say contractor.
4. **hiring_manager_user_id + requirement_type unset on all 30 CH rows** — Hiring manager and Type columns show dashes until populated (source data had none; do not fabricate).
5. **FX refresh wiring** (Glen 2026-07-22): fx_rate columns exist; daily 06:00 FX cron exists for expenses (cron.js, fxBreaker); wire hiring FX to it. Not started.
6. Pre-existing/parked: 09:00 cron emails fail (names-as-recipients + Graph 429); worktree `.worktrees/hiring-plan-approval` + branch `codex/hiring-plan-approval` delete after UAT; dirty-but-not-mine working tree files (deleted `.agents/skills/**`, `.claude/harness/*` edits, decisions.md, older session logs, news-aggregator files) need their owning sessions or a decision.

## Key IDs / paths

- CH client_id: `21be0772-73e5-4cca-8795-8b1a66f89ec2` (30 positions: 29 approved 1 pending, 12 filled, 106 candidates, 31 approval events, 8 departments)
- Prod DB: postgresql://nbiai:***@localhost:5432/nbi_dashboard; test DB nbi_dashboard_test (.env.test)
- Capabilities: `lib/hiring-plan-permissions.js` (approve_or_deny = NBI admin || COO; view_financials = admin/COO/FinanceDir; view_salary_range adds recruiters)
- Denial reasons: beyond_financial_boundaries | not_current_priority | lacks_information | other(+comment). closed_reason CHECK: filled | shut_down
- Mockup: `docs/superpowers/mockups/hiring-plan-mockup.html`; spec: `docs/superpowers/specs/2026-07-21-worksage-hiring-plan-design.md`

## Resume sequence (fresh session)

1. Read this file + tail of `projects/nbi_dashboard/session_logs/2026-07-23_session.md`.
2. Verify HEAD `4900434`, no parallel sessions, no orphaned ProcessContainer workers (see State section for the check).
3. If Glen has UAT feedback: systematic-debugging per item, worktree if >3 dashboard files.
4. Else: item 2 (CH settings — ask Glen for on-cost % + COO/Finance mapping), then item 5 (FX wiring).
