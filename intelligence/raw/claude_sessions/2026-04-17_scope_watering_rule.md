---
source: claude
source_id: handoff_2026-04-17a_news_aggregator_m1_start
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-17a_news_aggregator_m1_start.md
ingested: 2026-05-25
topics_detected: [working-rules, scope-integrity, timeline-aversion, news-aggregator]
relevance_score: 10
novelty_score: 10
actionability_score: 10
bank_candidates: [personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Two Hard Rules: No Scope-Watering, No Timelines

## Key Content

Two permanent cross-session rules established through severe Glen pushback during news aggregator design. Rule 1 -- No scope-watering: triggered by narrowing 46 sources to 10, swapping entity-extraction clustering for "LLM picks one representative", dropping Consumer tab, deferring release calendar and layoffs tracker, and suggesting Ollama to save pennies. Glen's verbatim: "Hacky code corner cutting watering down my intention to lower the quality is completely fucking unacceptable." Rule 2 -- No timelines: triggered by cycling through 2 days, 4 weeks, and 6-8 weeks on the same project within an hour. Glen's verbatim: "stop quoting timelines; you're terrible at them." Structure work by milestone deliverables, never by duration.

## Decisions / Insights

- HARD RULE: Default to the quality outcome; cost and scope trims offered only after the quality version is on the table and only with real justification
- HARD RULE: Never quote durations (weeks/days/hours). Structure by milestone deliverables. Calendar dates set by Glen are data, not estimates
- Glen reads scope reduction as laziness, not pragmatism
- Suggesting cheaper alternatives (Ollama vs Claude) to save cost is unwelcome unless Glen raises cost concerns first
- These rules apply to every future conversation and every project

## Context

News aggregator design session. Glen chose claude-sonnet-4-6 for all pipeline stages, rejected Haiku downgrade because "curation and summaries are the whole point." Actual cost of 30-day backfill: $0.79.

## Applicability

- Never propose scope reduction as the default -- build the full version first
- Never estimate duration -- describe what each milestone delivers
- If cost is a concern, present actual cost data (like the $0.79 figure) rather than preemptive downgrades
- Model selection should match the task's quality requirements, not budget anxiety
