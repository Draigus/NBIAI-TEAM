# Pipeline State

Last updated: 2026-06-11 (cadence run — granola ingest, 30 new extracts from Jun 2–11)

## Last Ingestion Run Per Source

Counts are files on disk in intelligence/raw/ (verified 2026-06-11), with the newest file's date as the effective last-run marker.

| Source | Extracts On Disk | Newest Extract | Next Scheduled |
|--------|------------------|----------------|----------------|
| granola | 142 | 2026-06-11 | daily 19:00 local (intel-ingest task, Granola MCP) |
| gmail | 10 | 2026-05-26 | blocked: connectors not credentialed (routines.md Gaps) |
| slack | 6 | 2026-05-25 | blocked: connectors not credentialed (routines.md Gaps) |
| web_research | 91 | 2026-06-11 | weekdays 12:30 local (intel-research task) |
| onedrive | 25 | 2026-05-25 | manual |
| downloads | 2 | 2026-05-25 | manual |
| chatgpt | 34 | 2026-05-25 | one-time (complete) |
| claude_sessions | 26 | 2026-05-25 | manual |

## Bank Compilation Status

All 7 banks fully rebuilt 2026-06-11 (first compilation since 2026-05-25; the cloud routine never delivered — see company/routines.md).

| Bank | Last Compiled | Extracts Integrated | Lines | Shelf Life | Status |
|------|---------------|---------------------|-------|-----------|--------|
| production_methods | 2026-06-11 | 38 | 335 | 60d | RECOMPILE NEEDED (15+ new extracts from cadence run) |
| industry_current | 2026-06-11 | 47 | 238 | 7d | STALE + RECOMPILE NEEDED (Athens games scene, Epic-Disney, Tencent acquisition pattern) |
| client_couch_heroes | 2026-06-11 | 49 | 288 | never expires | RECOMPILE NEEDED (25+ new extracts from cadence run) |
| forecast_models | 2026-06-11 | 23 | 342 | 30d | fresh |
| personal_insights | 2026-06-11 | 20 + 6 retained | 171 | never expires | RECOMPILE NEEDED (3 new extracts: NBI pipeline, Tom partnership, Aris AI workflow) |
| client_patterns | 2026-06-11 | 33 | 275 | 14d | borderline (2 new extracts: Lighthouse/Tencent, GCP migration) |
| games_pitch_decks | 2026-06-11 | 17 | 234 | 30d | fresh |

## Pending Review

- Sensitive extracts awaiting approval: restricted extracts were SKIPPED during the 2026-06-11 rebuild (10 unique IDs, mostly CTO search and compensation material; listed in session log 2026-06-11). They remain in raw/ unintegrated.
- Bank suggestions pending: 5 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database, competitor_watch)
- Banks needing recompilation: none
- Stale banks: none
- Brain delta: regenerated 2026-06-11 (intelligence/synthesis/brain_delta.md) — review pending

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
