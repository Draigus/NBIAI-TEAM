# Pipeline State

Last updated: 2026-06-23 (cadence run 07:00 -- morning brief regenerated; Telegram MCP unavailable in unattended run, brief not pushed to Glen)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 212 | 2026-06-22 | daily 19:00 local (intel-ingest task, Granola MCP) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 117 | 2026-06-22 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-06-19 | 67 | ~490 | 60d | recompile ready (+5 new from 2026-06-22 ingest: proxy-kit art quality tier, poisoned-phrase studio reframing, VS dual purpose, junior hire policy remote studio, Jira setup methodology game studio) |
| industry_current | 2026-06-19 | 64 | ~315 | 7d | STALE as of 2026-06-26; +2 new from 2026-06-22 ingest: UK Games Fund prototype grant, game investment VS as Series B threshold; recompile urgently |
| client_couch_heroes | 2026-06-18 | 88 | ~520 | never expires | below threshold for recompile (+0 new compilable from 2026-06-22 ingest: all CH content anonymised/public; restricted not written: Charlie separation proceedings Jun 19, Glen full-time offer terms Jun 22) |
| forecast_models | 2026-06-17 | 31 | ~520 | 30d | fresh (compiled 2026-06-17; +4 new: console market sizing — Switch eShop rank-to-units, console-as-%-of-Steam, PSN trophy proxy, ARPU/ARPPU by platform; 0 new since last compilation) |
| personal_insights | 2026-06-11 | 20 + 6 retained | 171 | never expires | below threshold (+2 from 2026-06-19 ingest; 0 new from 2026-06-22 -- restricted not written: Glen full-time offer ~£250k+equity, Greece citizenship/tax planning) |
| client_patterns | 2026-06-19 | 46 | ~374 | 14d | below threshold for recompile (+2 new from 2026-06-22 ingest: poisoned-phrase studio reframing, junior hire policy remote studio; not yet at 3-extract threshold since last compile) |
| games_pitch_decks | 2026-06-15 | 20 | 270 | 30d | recompile ready (8 new since 2026-06-15: CH VDR fundraising readiness, CH publisher/investor strategy, 3 web_research extracts 2026-06-22 + 3 new 2026-06-22 ingest: investor readiness staging by round type, UK Games Fund prototype grant, game investment VS as Series B threshold) |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision. New restricted extracts added 2026-06-17: 2026-06-17_ch-hr-terminations-june-17.md (Charlie/Alon/Ella termination decisions, Nicholas/Panos offboarding — named employees, active termination proceedings), 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments — Pair, Auto, Alex, Richard Watson). New restricted extracts added 2026-06-18: 2026-06-18_ch-hr-decisions-june-18.md (Charlie termination, Ella/Yorgos/Anthony Spain arrangements, Graham warning, hiring decisions), 2026-06-18_ch-team-capability-art-june-18.md (named art team performance assessments).
- Bank suggestions pending: 6 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch, games_design [NEW: 4 extracts from 2026-06-22 ingest -- entity/component emergence architecture, social design spectrum, quest taxonomy, corruption/PVP honey pot; requires Glen approval to create])
- Banks needing recompilation: production_methods (+5 new), games_pitch_decks (+8 new since last compile), industry_current (STALE +2 new -- urgent)
- Restricted not written 2026-06-22: Charlie follow-up separation proceedings (Jun 19, named employee active HR matter), Glen full-time offer from Aris ~£250k+equity (Jun 22, contract terms), Glen Greece citizenship/tax plan (Jun 22, personal financial/legal)
- Brain delta: last appended 2026-06-19 (intelligence/synthesis/brain_delta.md) -- 2026-06-11 through 2026-06-19 sections awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
