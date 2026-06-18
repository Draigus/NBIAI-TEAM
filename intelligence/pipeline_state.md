# Pipeline State

Last updated: 2026-06-18 (cadence run 21:30 — bank recompilation; 4 banks compiled: client_couch_heroes 88 extracts, production_methods 54 extracts, industry_current 61 extracts, client_patterns 38 extracts; 2 restricted extracts skipped; brain_delta updated)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 182 | 2026-06-18 | daily 19:00 local (intel-ingest task, Granola REST API) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 111 | 2026-06-18 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-06-18 | 54 | ~470 | 60d | fresh (compiled 2026-06-18 21:30; +7 new: art output tracking biweekly view, studio hiring pipeline governance, vertical slice fear management, Slack DSAR comms hygiene, contractor vs employee lexicon, staff quadrant review methodology, S-curve change management) |
| industry_current | 2026-06-18 | 61 | ~310 | 7d | fresh (compiled 2026-06-18 21:30; +5 new: UE6 Verse/AI integration, Nintendo Switch 2 FY2026 earnings, Google Play Level Up Tier 2 discovery gate, TaleMonster $30M Series A, Xbox studios spin-off negotiations) |
| client_couch_heroes | 2026-06-18 | 88 | ~520 | never expires | fresh (compiled 2026-06-18 21:30; +5 new compilable: art output tracking, game vision pillar-promise-systems, VDR fundraising readiness, operational updates onboarding/contracts, estimation biweekly quality; 2 restricted skipped: HR decisions June 18, team capability art June 18) |
| forecast_models | 2026-06-17 | 31 | ~520 | 30d | fresh (compiled 2026-06-17; +4 new: console market sizing — Switch eShop rank-to-units, console-as-%-of-Steam, PSN trophy proxy, ARPU/ARPPU by platform; 0 new since last compilation) |
| personal_insights | 2026-06-11 | 20 + 6 retained | 171 | never expires | below threshold (0 compilable new extracts since 2026-06-11 rebuild; 4 items listed in pipeline_state were pre-rebuild or restricted) |
| client_patterns | 2026-06-18 | 38 | ~380 | 14d | fresh (compiled 2026-06-18 21:30; +5 new: probation termination competency misrepresentation, S-curve change management, staff quadrant review methodology, studio hiring pipeline governance, vertical slice fear management) |
| games_pitch_decks | 2026-06-15 | 20 | 270 | 30d | below threshold (2 new since 2026-06-15: CH VDR fundraising readiness, CH publisher/investor strategy; recompile when 3rd qualifying extract added) |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision. New restricted extracts added 2026-06-17: 2026-06-17_ch-hr-terminations-june-17.md (Charlie/Alon/Ella termination decisions, Nicholas/Panos offboarding — named employees, active termination proceedings), 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments — Pair, Auto, Alex, Richard Watson). New restricted extracts added 2026-06-18: 2026-06-18_ch-hr-decisions-june-18.md (Charlie termination, Ella/Yorgos/Anthony Spain arrangements, Graham warning, hiring decisions), 2026-06-18_ch-team-capability-art-june-18.md (named art team performance assessments).
- Bank suggestions pending: 5 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch)
- Banks needing recompilation: none (all 7 banks compiled 2026-06-18 or fresher)
- Stale banks: none
- Brain delta: last appended 2026-06-18 (intelligence/synthesis/brain_delta.md) — 2026-06-11 through 2026-06-18 sections awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
