---
source: granola
source_id: b3d76630-9ec0-4261-8b0d-81ce0091e24b
source_path: https://notes.granola.ai/d/b3d76630-9ec0-4261-8b0d-81ce0091e24b
ingested: 2026-06-22
topics_detected: [production, jira, project-management, tooling, studio-operations]
relevance_score: 7
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Jira Setup Methodology for a Scaling Game Studio

## Key Content
Implementation approach from an experienced Jira administrator (Blizzard, My.games background) for onboarding a 60-70 person game studio:

**Configuration principles:**
- Components: preferred over labels for grouping and cross-team reporting
- Labels: disabled wherever possible; human error (typos) breaks filters and creates unmaintainable taxonomies
- Custom fields: only when genuinely needed, never duplicating existing fields, shared across projects
- Standardisation over team autonomy: "everyone does it their own way" is a cross-team communication breakdown waiting to happen

**Setup process:**
1. Requirements gathering from three user levels: executives (dashboards), team leads (assignment + standups), individual contributors (task execution)
2. Capture constraints: security, cross-team visibility rules
3. Focus group prototype: one Jira-experienced user + one per level + one newcomer
4. Observe a real standup or daily to catch friction in use before configuring
5. Roll out with training, then open 1:1 support post-launch
6. Train 2-3 super users for light admin so team handles small changes independently
7. Document everything in Confluence

**Issue hierarchy for games:** Epic > Feature > Story > Task. Tasks are the executable unit: time-logged, workflow-moved, closed by the worker. Automation closes parent features/epics when all children close.

**Bug workflow:** QA submits with steps, priority, and logs. Critical bugs trigger Slack notification for immediate pickup. Medium/low enter sprint backlog. Confluence runbook maps bug type to the person to pull in (network, gameplay, engine, etc.).

**Migration rationale:** ClickUp/GitHub → Jira/Perforce. Mainstream tools lower onboarding complexity as studios scale; well-known tooling reduces the learning curve for new hires.

## Decisions / Insights
- Administrator concluded: disable labels wherever possible; component-based structure is more durable
- Pattern recognised: studios that give teams autonomy over Jira structure create cross-team reporting breakdown at scale
- Glen decided: Jira + Perforce is the right tooling choice for a studio doubling in size — onboarding simplicity outweighs tooling cost
- Administrator observed: observing a real standup before configuring reveals friction that requirements docs never capture

## Context
Onboarding session between Glen and a Jira administrator candidate for a ~70-person MMO studio, 2026-06-22. Studio is migrating from ClickUp and GitHub to Jira and Perforce as part of a scaling initiative. Administrator has implemented Jira at Blizzard and My.games.

## Applicability
Relevant when: advising a studio that is evaluating or migrating to Jira and needs a structured implementation approach.
Relevant when: a studio's Jira instance has become unmaintainable due to per-team autonomy and needs rationalisation.
Relevant when: NBI is sourcing or briefing a Jira administrator for a client studio.
Relevant when: a studio is moving from lightweight PM tools (ClickUp, Notion, GitHub Projects) to enterprise tooling as it scales past 40-50 people.
