# Pipeline State

## Last Ingestion Run Per Source

| Source | Last Run | Extracts Produced | Extracts Promoted | Next Scheduled |
|--------|----------|-------------------|-------------------|----------------|
| granola | never | 0 | 0 | daily 20:03 UK |
| gmail | never | 0 | 0 | daily 20:07 UK |
| slack | never | 0 | 0 | daily 20:12 UK |
| onedrive | never | 0 | 0 | manual |
| downloads | never | 0 | 0 | manual |
| chatgpt | 2026-05-25 | 34 | 34 | one-time (complete) |
| claude_sessions | 2026-05-25 | 26 | 26 | manual |
| web_research | never | 0 | 0 | per schedule |

## Bank Compilation Status

| Bank | Last Compiled | Sources | Threshold (3) | Action |
|------|---------------|---------|---------------|--------|
| production_methods | 2026-05-25 | 29 | — | compiled |
| games_pitch_decks | 2026-05-25 | 10 | — | compiled |
| forecast_models | 2026-05-25 | 11 | — | compiled |
| industry_current | never | 2 | not met | waiting |
| client_patterns | 2026-05-25 | 6 | — | compiled |
| personal_insights | 2026-05-25 | 20 | — | compiled |
| client_couch_heroes | 2026-05-25 | 9 | — | compiled |

## Bank Health

| Bank | Lines | Last Compiled | Shelf Life | Status |
|------|-------|---------------|-----------|--------|
| personal_insights | 131 | 2026-05-25 | never | fresh |
| production_methods | 153 | 2026-05-25 | 60d | fresh |
| forecast_models | 93 | 2026-05-25 | 30d | fresh |
| games_pitch_decks | 113 | 2026-05-25 | 30d | fresh |
| client_patterns | 91 | 2026-05-25 | 14d | fresh |
| client_couch_heroes | 110 | 2026-05-25 | never | fresh |

## Pending Review

- Sensitive extracts awaiting approval: 0
- Bank suggestions pending: 4 (consulting_frameworks, studio_staffing_models, salary_benchmarks, investor_database — from ChatGPT harvest, thresholds not yet met)
- Stale banks: 0
- industry_current: 2 extracts, needs 1 more to compile

## Local File Tracking

(populated after first /ingest-local run)
