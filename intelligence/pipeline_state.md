# Pipeline State

Last updated: 2026-06-16 (cadence run 19:00 — granola ingest; 8 extracts added from 4 meetings: scope governance discipline, build stability/merge cadence, estimation min+20% method, publisher/investor strategy, documentation SOT decision, hiring status, OKR/LRP framework, remote team communication frameworks; 3 restricted items skipped — Charlie/Ella performance, Anthony settlement, Simao interview outcome)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 165 | 2026-06-16 | daily 19:00 local (intel-ingest task, Granola REST API) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 102 | 2026-06-16 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-06-11 | 38 | 335 | 60d | RECOMPILE NEEDED (+6 new 2026-06-16: scope governance discipline, build stability/merge cadence, estimation min+20% method, documentation SOT decision, OKR/LRP framework, remote team communication frameworks; prev: 15+ from cadence run, +4 from 2026-06-14, +3 from 2026-06-15) |
| industry_current | 2026-06-11 | 47 | 238 | 7d | RECOMPILE NEEDED (4 new extracts: Xbox reset/Asha Sharma, Tencent/Game Science 24%, GDC 2026 AI trends, PEGI loot box PEGI 16 live) |
| client_couch_heroes | 2026-06-15 | 77 | 370 | never expires | RECOMPILE NEEDED (+6 new 2026-06-16: scope governance, build stability, documentation SOT, hiring status, publisher/investor strategy, OKR/LRP framework; prev: recompiled 2026-06-15 21:30 cadence) |
| forecast_models | 2026-06-11 | 23 | 342 | 30d | fresh (+4 new extracts 2026-06-16: market sizing — Steam review-count revenue, Steam genre comp analysis, mobile TAM/SAM/SOM, Steam genre viability percentile; recompile when next needed) |
| personal_insights | 2026-06-11 | 20 + 6 retained | 171 | never expires | RECOMPILE NEEDED (3 new extracts: NBI pipeline, Tom partnership, Aris AI workflow; +1 new 2026-06-15: Stavros Lighthouse contract resourcing decision) |
| client_patterns | 2026-06-11 | 33 | 275 | 14d | borderline (2 new extracts: Lighthouse/Tencent, GCP migration; +1 new 2026-06-15: Lighthouse Stavros contract/Jira integration pattern) |
| games_pitch_decks | 2026-06-15 | 20 | 270 | 30d | fresh (+1 new 2026-06-16: CH publisher/investor strategy — self-publish rationale + sub-studio dividend model; recompile when 2+ more added) |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated. New restricted extract added 2026-06-12: 2026-06-12_ch-leadership-hr-decisions.md (Lorenzo termination, Nicholas contract closure, Madalena/Daniel hardware compensation, Kunjal training spend). New restricted extracts added 2026-06-15: 2026-06-15_ch-director-performance-concerns.md (David/Michael/Robin director telemetry — marked private), 2026-06-15_ch-charlie-chain-of-command-issue.md (personnel — unfulfilled lead promise), 2026-06-15_lighthouse-stavros-contract-jira-sync.md (Stavros rate differential — commercial sensitivity), 2026-06-15_ch-interview-lead-gameplay-programmer-georgii.md (named candidate, NO outcome). Three new restricted items NOT written 2026-06-16: (1) Charlie/Ella performance issues — named employees, potential termination proceedings; (2) Anthony settlement — employment dispute, named individual, specific settlement amount (€6.1K); (3) Tech Producer Simao interview outcome — named candidate with rejection decision.
- Bank suggestions pending: 5 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch)
- Banks needing recompilation: none
- Stale banks: none
- Brain delta: last appended 2026-06-15 (intelligence/synthesis/brain_delta.md) — 2026-06-11, 2026-06-12, and 2026-06-15 sections all awaiting Glen's adjudication

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
