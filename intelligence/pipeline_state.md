# Pipeline State

Last updated: 2026-06-20 (cadence run 19:00 -- granola ingest: 0 new extracts; 8 meetings found all previously ingested from Jun 19 run; no Jun 20 meetings yet)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 200 | 2026-06-20 | daily 19:00 local (intel-ingest task, Granola MCP) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 114 | 2026-06-19 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-06-19 | 67 | ~490 | 60d | compiled 2026-06-19 21:30 (+13 new: quality-tier scope governance, staged replacement, weekly build visibility, Jira/Perforce rollout sequence, producer as defect translator, employee survey timing, quad assessment, pillar-promise-value-creation, seniority distribution target, founder idea log governance, nightly stable build protocol, MMO branch architecture, QA tooling evaluation PR model) |
| industry_current | 2026-06-19 | 64 | ~315 | 7d | compiled 2026-06-19 21:30 (+3 new: Ninja Theory confirmed closed June 16, EA EC deadline July 22 / CFIUS September 28 / FSR review, GTA 6 pre-orders June 25 / November 19 locked); bank expires 2026-06-26 |
| client_couch_heroes | 2026-06-18 | 88 | ~520 | never expires | fresh (compiled 2026-06-18 21:30; +5 new compilable: art output tracking, game vision pillar-promise-systems, VDR fundraising readiness, operational updates onboarding/contracts, estimation biweekly quality; 2 restricted skipped: HR decisions June 18, team capability art June 18) |
| forecast_models | 2026-06-17 | 31 | ~520 | 30d | fresh (compiled 2026-06-17; +4 new: console market sizing — Switch eShop rank-to-units, console-as-%-of-Steam, PSN trophy proxy, ARPU/ARPPU by platform; 0 new since last compilation) |
| personal_insights | 2026-06-11 | 20 + 6 retained | 171 | never expires | below threshold (+2 new from 2026-06-19 ingest: NBI hiring pipeline June 2026, NBI opportunity pipeline June 2026; not yet at 3-extract threshold for compilation) |
| client_patterns | 2026-06-19 | 46 | ~374 | 14d | compiled 2026-06-19 21:30 (+8 new: garden leave eligibility contract gap, staged replacement methodology, producer as defect translator, employee survey timing principle, AI-native hiring standard, studio seniority distribution target, founder idea log governance, quad assessment for production readiness) |
| games_pitch_decks | 2026-06-15 | 20 | 270 | 30d | below threshold (2 new since 2026-06-15: CH VDR fundraising readiness, CH publisher/investor strategy; recompile when 3rd qualifying extract added) |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision. New restricted extracts added 2026-06-17: 2026-06-17_ch-hr-terminations-june-17.md (Charlie/Alon/Ella termination decisions, Nicholas/Panos offboarding — named employees, active termination proceedings), 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments — Pair, Auto, Alex, Richard Watson). New restricted extracts added 2026-06-18: 2026-06-18_ch-hr-decisions-june-18.md (Charlie termination, Ella/Yorgos/Anthony Spain arrangements, Graham warning, hiring decisions), 2026-06-18_ch-team-capability-art-june-18.md (named art team performance assessments).
- Bank suggestions pending: 5 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch)
- Banks needing recompilation: none (all 7 banks compiled 2026-06-18 or fresher; production_methods, client_patterns, industry_current compiled 2026-06-19)
- Stale banks: none
- Brain delta: last appended 2026-06-19 (intelligence/synthesis/brain_delta.md) -- 2026-06-11 through 2026-06-19 sections awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
