# Pipeline State

Last updated: 2026-06-18 (cadence run 19:00 — granola ingest; 11 extracts added: CH art output tracking, CH team capability art [restricted], CH game vision pillar-promise-systems, CH HR decisions June 18 [restricted], studio hiring pipeline governance, vertical slice fear management, Slack DSAR comms hygiene, contractor vs employee lexicon, staff quadrant review methodology, S-curve change management, CH VDR fundraising readiness)

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
| production_methods | 2026-06-11 | 38 | 335 | 60d | RECOMPILE NEEDED (+7 new 2026-06-18: art output tracking biweekly view, studio hiring pipeline governance 3-candidate rule, vertical slice fear management, Slack DSAR comms hygiene, contractor vs employee lexicon, staff quadrant review methodology, S-curve change management; prev +8 2026-06-17: estimation bi-weekly quality + kick-it-back discipline, min/max estimation credibility theory, probation termination competency misrepresentation pattern; prev +6 2026-06-16: scope governance, build stability/merge cadence, estimation min+20%, documentation SOT, OKR/LRP, remote team communication; prev: 15+ from cadence run, +4 from 2026-06-14, +3 from 2026-06-15) |
| industry_current | 2026-06-11 | 47 | 238 | 7d | RECOMPILE NEEDED (+5 new extracts 2026-06-18: UE6 Verse/AI integration, Nintendo Switch 2 FY2026 earnings, Google Play Level Up Tier 2 discovery gate, TaleMonster $30M Series A, Xbox studios spin-off negotiations; prev +4: Xbox reset/Asha Sharma, Tencent/Game Science 24%, GDC 2026 AI trends, PEGI loot box PEGI 16 live) |
| client_couch_heroes | 2026-06-15 | 77 | 370 | never expires | RECOMPILE NEEDED (+5 new 2026-06-18: art output tracking [shared with production_methods], team capability art June 18 [restricted], game vision pillar-promise-systems, HR decisions June 18 [restricted], VDR fundraising readiness; prev +10 2026-06-17: HR terminations June 17 [restricted], CTO search pipeline June 17 [restricted], operational updates onboarding/contracts, estimation bi-weekly quality [shared with production_methods]; prev +6 2026-06-16: scope governance, build stability, documentation SOT, hiring status, publisher/investor strategy, OKR/LRP; prev: recompiled 2026-06-15 21:30 cadence) |
| forecast_models | 2026-06-11 | 23 | 342 | 30d | fresh (+8 new extracts: 2026-06-16: market sizing — Steam review-count revenue, Steam genre comp analysis, mobile TAM/SAM/SOM, Steam genre viability percentile; 2026-06-17: console market sizing — Switch chart rank benchmarks, console % of Steam framework, PSN trophy proxy, console ARPU/ARPPU; recompile when next needed) |
| personal_insights | 2026-06-11 | 20 + 6 retained | 171 | never expires | RECOMPILE NEEDED (3 new extracts: NBI pipeline, Tom partnership, Aris AI workflow; +1 new 2026-06-15: Stavros Lighthouse contract resourcing decision) |
| client_patterns | 2026-06-11 | 33 | 275 | 14d | RECOMPILE NEEDED (+4 new 2026-06-18: studio hiring pipeline governance, vertical slice fear management, staff quadrant review methodology, S-curve change management; prev +1 2026-06-17: probation termination competency misrepresentation pattern; prev 4: Lighthouse/Tencent, GCP migration, Lighthouse Stavros contract/Jira integration pattern) |
| games_pitch_decks | 2026-06-15 | 20 | 270 | 30d | fresh (+1 new 2026-06-18: CH VDR fundraising readiness — VDR structure, investor credibility signals, vertical slice mapped; +1 new 2026-06-16: CH publisher/investor strategy — self-publish rationale + sub-studio dividend model; recompile when 1+ more added) |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision. New restricted extracts added 2026-06-17: 2026-06-17_ch-hr-terminations-june-17.md (Charlie/Alon/Ella termination decisions, Nicholas/Panos offboarding — named employees, active termination proceedings), 2026-06-17_ch-cto-search-pipeline-june-17.md (named CTO candidates with assessments — Pair, Auto, Alex, Richard Watson).
- Bank suggestions pending: 5 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch)
- Banks needing recompilation: none
- Stale banks: none
- Brain delta: last appended 2026-06-15 (intelligence/synthesis/brain_delta.md) — 2026-06-11, 2026-06-12, and 2026-06-15 sections all awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
