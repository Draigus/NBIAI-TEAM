# Pipeline Rules

## Compilation Triggers
- Threshold: >= 3 new qualifying extracts for a bank since last compilation
- Full rebuild trigger: > 30% of bank's total extracts are new
- Maximum bank size: 500 lines (split if exceeded)

## Quality Gate Thresholds
- Relevance: >= 6/10
- Novelty: >= 5/10
- Actionability: >= 5/10
- All three must pass. Failing any one = stays in raw/

## Bank Suggestion Threshold
- >= 3 extracts with matching new_bank_suggestions
- From >= 2 different sources
- Within the last 14 days
- Auto-create: disabled (require Glen's approval until 5+ manual approvals)

## Context Budget
- Session-start load: intelligence brief (~50 lines) + up to 3 bank summaries (~50 lines each)
- Mid-session full bank load: maximum 2 at once
- Proactive surfaces per session: maximum 2 (hard cap)

## Scheduling
- Daily ingestion (Granola, Gmail, Slack): 20:00 UK
- Daily brief generation: 07:00 UK
- Weekly research (pitch decks): Monday 06:00 UK
- Weekly research (production): Wednesday 06:00 UK
- Weekly research (competitors): Friday 06:00 UK
- Fortnightly research (forecasts): Tuesday 06:00 UK (alternate weeks)
- Daily research (industry intel): 06:00 UK

## Git Commit Format
- New extracts: intel(raw): ingest {source} +{N} extracts
- New bank: intel(bank): create {bank-slug} ({N} sources)
- Bank update: intel(bank): update {bank-slug} (+{N} extracts)
- Brief: intel(brief): daily brief {date}
- Research: intel(research): {domain} cycle — {N} findings
- Config: intel(config): update {file}
