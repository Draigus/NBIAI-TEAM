---
source: claude
source_id: handoff_2026-04-19_tech_debt_sprint
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-19_tech_debt_sprint.md
ingested: 2026-05-25
topics_detected: [tech-debt-prioritisation, glen-work-ordering, sync-pipeline]
relevance_score: 7
novelty_score: 7
actionability_score: 8
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Tech Debt Before Features: Glen's Work Ordering

## Key Content

Glen explicitly approved "tech debt before features" and set the specific ordering: F-B8 (board drag-drop through sync pipeline -- data loss risk) > F-B17 (renderAll/renderContent drift) > F-B22 (inline onclick handlers blocking strict CSP) > F-B16 (window globals as view state), then features. Performance items (shiftForInsert O(N), pagination) parked until data volumes warrant. All 20 Critical audit items resolved (18 code fixes + B-C1 manual credential rotation + F-C2 cookie migration already done). Cookie migration from localStorage to HttpOnly was discovered to be already complete -- server sets HttpOnly cookie on login, frontend uses credentials:'include', zero localStorage token references.

## Decisions / Insights

- Glen prioritises tech debt by user-facing data-loss risk, not by code aesthetics
- Board drag-drop bypassing sync/conflict detection was the highest-risk item (silent overwrites in multi-user editing)
- Performance optimisation is explicitly deferred until data volumes justify it
- Contracts kept forever -- no retention cleanup (Glen's explicit decision, B-B17 closed)
- "Do the ones you can do on your own" = Glen trusts autonomous execution on mechanical fixes

## Context

This established the permanent work ordering principle: fix data-loss risks first, then architectural drift, then CSP compliance, then state management.

## Applicability

- When proposing work order, lead with data-loss risk items, not code quality items
- Performance optimisation should be deferred until real data volumes cause actual problems
- Glen trusts autonomous execution on "mechanical" fixes -- only escalate decisions and architectural choices
- Check existing code before assuming something is not done -- the cookie migration was already complete
