# Pipeline State

## Last Ingestion Run Per Source

| Source | Last Run | Extracts Produced | Extracts Promoted | Next Scheduled |
|--------|----------|-------------------|-------------------|----------------|
| granola | never | 0 | 0 | TBD |
| gmail | never | 0 | 0 | TBD |
| slack | never | 0 | 0 | TBD |
| onedrive | never | 0 | 0 | manual |
| downloads | never | 0 | 0 | manual |
| chatgpt | never | 0 | 0 | one-time |
| claude_sessions | 2026-05-25 | 26 | 26 | manual |
| web_research | never | 0 | 0 | per schedule |

## Bank Compilation Status

| Bank | Last Compiled | New Since | Threshold (3) | Action |
|------|---------------|-----------|---------------|--------|
| production_methods | 2026-05-25 | 0 | — | compiled |
| games_pitch_decks | never | 0 | not met | waiting |
| forecast_models | never | 0 | not met | waiting |
| industry_current | never | 0 | not met | waiting |
| client_patterns | never | 1 | not met | waiting |
| personal_insights | 2026-05-25 | 0 | — | compiled |
| client_couch_heroes | never | 0 | not met | waiting |

## Bank Health

| Bank | Lines | Last Compiled | Shelf Life | Status | Sessions Used (30d) |
|------|-------|---------------|-----------|--------|---------------------|
| personal_insights | 201 | 2026-05-25 | never | fresh | 0 |
| production_methods | 239 | 2026-05-25 | 60d | fresh | 0 |

## Pending Review

- Sensitive extracts awaiting approval: 0
- Bank suggestions pending: 1 (ai_capabilities — 2 extracts, threshold not met)
- Stale banks: 0

## Local File Tracking

(populated after first /ingest-local run)
