# Pipeline State

Last updated: 2026-06-24 (cadence run 19:00 -- granola ingest: 7 extracts from 4 meetings; Gmail + Slack skipped per guards)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 229 | 2026-06-24 | daily 19:00 local (intel-ingest task, REST API) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 122 | 2026-06-24 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-06-23 | 79 | 365 | 60d | current -- compiled 2026-06-23 cadence run; 12 new extracts integrated (live service vs box game mindset, milestone as pressure, VS dual purpose, VS real game anxiety, proxy kit quality floor, art bible SOT, decision owner model, executive RAG format, poisoned phrase, junior hire policy, Jira setup methodology, Jira parallel-run migration) |
| industry_current | 2026-06-23 | 67 | ~345 | 7d | current -- compiled 2026-06-23 cadence run; 3 new extracts integrated (VS as Series B threshold per Magna Capital, UK Games Fund £100k grants, Tencent Level Infinite data sovereignty/publishing terms anonymised) |
| client_couch_heroes | 2026-06-18 | 88 | ~520 | never expires | below threshold for recompile (+1 new from 2026-06-23 ingest: Tencent data sovereignty publishing terms; restricted not written: Charlie separation Jun 19, Glen full-time offer Jun 22, named HR/personnel decisions Jun 23 Exec Meeting and Work Work Work) |
| forecast_models | 2026-06-17 | 31 | ~520 | 30d | fresh (compiled 2026-06-17; +4 new: console market sizing; 0 new from 2026-06-23 ingest) |
| personal_insights | 2026-06-23 | 23 | ~210 | never expires | current -- compiled 2026-06-23 cadence run; 3 new extracts integrated (NBI HC opportunity pipeline Jun 19, NBI analytics/DE hiring pipeline Jun 19, WorkSage UX requirements from CH HR user session Jun 23) |
| client_patterns | 2026-06-23 | 54 | ~330 | 14d | current -- compiled 2026-06-23 cadence run; 8 new extracts integrated (live service vs box game mindset gap, VS real game anxiety, poisoned phrase problem, CTO assessment live service threshold, decision owner model, executive RAG meeting format, milestone as advisory lever, junior hire support requirements) |
| games_pitch_decks | 2026-06-23 | 29 | ~370 | 30d | current -- compiled 2026-06-23 cadence run; 9 new extracts integrated (VS as Series B threshold, UK Games Fund grant, investor readiness staging by round type, VS dual purpose, Grand Games $103M hybrid casual, Carry1st Africa $60M+, 3-stage mobile funding framework, non-exit investor profile/publisher analysis, veteran hire sequencing) |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision. New restricted extracts added 2026-06-17: 2026-06-17_ch-hr-terminations-june-17.md (Charlie/Alon/Ella termination decisions, Nicholas/Panos offboarding — named employees, active termination proceedings), 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments — Pair, Auto, Alex, Richard Watson). New restricted extracts added 2026-06-18: 2026-06-18_ch-hr-decisions-june-18.md (Charlie termination, Ella/Yorgos/Anthony Spain arrangements, Graham warning, hiring decisions), 2026-06-18_ch-team-capability-art-june-18.md (named art team performance assessments).
- Bank suggestions pending: 6 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch, games_design [NEW: 4 extracts from 2026-06-22 ingest -- entity/component emergence architecture, social design spectrum, quest taxonomy, corruption/PVP honey pot; requires Glen approval to create])
- Banks needing recompilation: production_methods (+12 new: 5 from prior Granola + 5 from 2026-06-24 web research + 2 from 2026-06-24 Granola: ats-hiring-workflow, estimate-challenge-scope-discipline), client_patterns (+10 new: 8 prior + 2 from 2026-06-24 Granola), games_pitch_decks (+9 new: 8 prior + series-a-funding-market), industry_current (STALE +3 new -- urgent, includes series-a-funding-market-june-2026), client_couch_heroes (+3 new total since last compile: Tencent sovereignty + ch-combat-spell-synergy + ch-mmo-design-positioning -- now at recompile threshold)
- Restricted not written 2026-06-22: Charlie follow-up separation proceedings (Jun 19, named employee active HR matter), Glen full-time offer from Aris ~£250k+equity (Jun 22, contract terms), Glen Greece citizenship/tax plan (Jun 22, personal financial/legal)
- Restricted not written 2026-06-22 Production Meeting (7723024a): James being let go (named employee, active termination), Alon departure with trigger details (named employee, disciplinary circumstances), Glen full-time offer £280k+Greece relocation ~£400k equivalent (duplicate of above)
- Restricted not written 2026-06-23 Executive Meeting (d9fe54d4): PO (Pär), Otto, Chris Southall CTO candidate assessments with named individuals and salary expectations (~€350k flagged), David Art Director performance concerns (named employee, active HR -- habituating team to walk over him), Stefano underperformer situation (named employee, unaware of expectations)
- Restricted not written 2026-06-23 Work Work Work (ad9cc165): Dino termination (no-notice, military absence), Ella contract closure (performance output), Charlie final payment confirmation, Kyron removal from payroll, Matt contractor-to-FTE decision, Daniel onboarding/resignation deadline (all named employees, active HR/payroll matters)
- Restricted not written 2026-06-24 Hiring update (5106de07): Sean offer accepted (contract pending address), Johanna offer at 500 euros/day, Peter Hartman on hold (US relocation concern), Eric Fang assessment (job-hop pattern, side projects -- named candidates with outcome data)
- Restricted not written 2026-06-24 Game direction alignment (f181174b): Seth/Yorgos/Maria performance quadrant assessments, Ella/Maddalena HR authority delegation, Nick/Dim sibling policy, Stefano underperformance (named employees with active performance proceedings)
- Restricted not written 2026-06-24 Alexander Vasyliev VC (3cadc973): named CTO candidate with full technical assessment (GrindCraft, Naval Action background; Cyprus-based; 120-person team management history; outcome pending ~2 weeks)
- Restricted not written 2026-06-24 Richard Watson VC (5148908e): named CTO candidate with role assessment (10y Rare/Microsoft/343i/People Can Fly; TD vs CTO evaluation; Glen's read: natural TD fit, CTO is growth role; outcome: follow-up call to be scheduled)
- Brain delta: last appended 2026-06-19 (intelligence/synthesis/brain_delta.md) -- 2026-06-11 through 2026-06-19 sections awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
