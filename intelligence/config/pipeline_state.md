# Pipeline State

Machine-readable state for the intelligence pipeline. Updated by each cadence run.

| Bank | Last Compiled | Extract Count | Lines | Status |
|---|---|---|---|---|
| client_couch_heroes | 2026-06-16 | 83 | ~490 | Fresh |
| production_methods | 2026-06-16 | 44 | ~430 | Fresh |
| forecast_models | 2026-06-16 | 27 | ~497 | Fresh |
| games_pitch_decks | 2026-06-15 | 20 | 270 | Fresh |
| industry_current | 2026-06-12 | 47 | -- | 4 days stale (7d shelf) |
| personal_insights | 2026-06-11 | 20 | -- | 5 days stale (no expiry) |
| client_patterns | 2026-06-11 | 33 | -- | 5 days stale (14d shelf) |

## Restricted Extracts Pending Glen Approval

- 12 legacy (accumulated 2026-06-11 to 2026-06-15; see brain_delta.md sections for details)
- 1 new 2026-06-16: 2026-06-15_lighthouse-stavros-contract-jira-sync.md (bank_candidates: client_patterns, personal_insights; not CH bank)

Total pending: 13

## Last Run

Cadence: 2026-06-16 21:30
Banks compiled: forecast_models, production_methods, client_couch_heroes (3)
Banks skipped: client_patterns (1 new extract, restricted), personal_insights (1 new, below threshold), games_pitch_decks (0 new), industry_current (0 new)
Restricted skipped: 1 (lighthouse-stavros, not compilable without Glen approval)
