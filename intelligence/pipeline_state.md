# Pipeline State

## Last Ingestion Run Per Source

| Source | Last Run | Extracts Produced | Extracts Promoted | Next Scheduled |
|--------|----------|-------------------|-------------------|----------------|
| granola | never | 0 | 0 | daily 20:03 UK |
| gmail | never | 0 | 0 | daily 20:07 UK |
| slack | never | 0 | 0 | daily 20:12 UK |
| onedrive | 2026-05-25 | 25 | 25 | manual |
| downloads | 2026-05-25 | 2 | 2 | manual |
| chatgpt | 2026-05-25 | 34 | 34 | one-time (complete) |
| claude_sessions | 2026-05-25 | 26 | 26 | manual |
| web_research | 2026-05-25 | 17 | 17 | per schedule |

## Bank Compilation Status

| Bank | Last Compiled | Sources | Threshold (3) | Action |
|------|---------------|---------|---------------|--------|
| production_methods | 2026-05-25 | 35 | — | compiled |
| games_pitch_decks | 2026-05-25 | 10 | +5 new research | recompile |
| forecast_models | 2026-05-25 | 18 | — | compiled |
| industry_current | 2026-05-25 | 11 | +7 new research | recompile |
| client_patterns | 2026-05-25 | 17 | — | compiled |
| personal_insights | 2026-05-25 | 20 | — | compiled |
| client_couch_heroes | 2026-05-25 | 19 | — | compiled |

## Bank Health

| Bank | Lines | Last Compiled | Shelf Life | Status |
|------|-------|---------------|-----------|--------|
| production_methods | 174 | 2026-05-25 | 60d | fresh |
| industry_current | 150 | 2026-05-25 | 7d | fresh |
| client_couch_heroes | 139 | 2026-05-25 | never | fresh |
| forecast_models | 136 | 2026-05-25 | 30d | fresh |
| personal_insights | 131 | 2026-05-25 | never | fresh |
| client_patterns | 127 | 2026-05-25 | 14d | fresh |
| games_pitch_decks | 113 | 2026-05-25 | 30d | fresh |

## Pending Review

- Sensitive extracts awaiting approval: 0
- Bank suggestions pending: 4 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database)
- Banks needing recompilation: games_pitch_decks (+5 research), industry_current (+7 research)
- Stale banks: 0

## Local File Tracking

First pass completed 2026-05-25. 25 OneDrive + 2 Downloads extracts.
~50 binary files (.docx, .xlsx, .pptx, .pdf) could not be read — need document conversion tooling for future passes.
