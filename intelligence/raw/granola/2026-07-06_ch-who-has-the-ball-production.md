---
source: granola
source_id: 6a3d909c-e6d2-4653-b77f-bbbb8f5a7464
source_path: https://notes.granola.ai/d/6a3d909c-e6d2-4653-b77f-bbbb8f5a7464
ingested: 2026-07-06
topics_detected: [production-ownership, task-accountability, p0-escalation, production-system, communication-protocol]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# "Who Has the Ball" Named Ownership System for Production Accountability

## Key Content

A lightweight production ownership protocol for studios where tasks and workstreams lack a clear named driver:

**Core mechanism:**
- Each task or workstream tagged with a single named owner ("who has the ball")
- Red ball = P0: that owner drops all other work and unblocks immediately
- Standard workstream tagging proceeds at normal priority

**Rollout approach:**
- Prototype within the production team first before extending to leads
- Assign a champion in each area to introduce the system and model it
- Production channel as the broadcast layer: AI-generated call summaries posted with links; other channels receive links, not duplicated content

**Supporting engineering gate:**
- Engineers do not build features without a design document; if no GDD entry exists, the request is kicked back
- Escalation path: if engineering is pushed to build without a GDD, they escalate to the senior advisor
- Anything past a defined pipeline gate does not go back; definitions of done are respected once reached

## Decisions / Insights

- Glen decided: "who has the ball" prototyped within the production team first, then rolled out with lead champions per area.
- Glen decided: red ball signals P0 for the named owner -- they drop everything; no ambiguity about priority level.
- Glen decided: production channel owns the broadcast layer; duplication across channels is not the model.
- Glen decided: engineering kicks back requests with no GDD; escalate to senior advisor if pushed.

## Context

Tutorial Cave kick-off at a ~55-person MMO studio, 6 Jul 2026. The studio was experiencing unclear ownership of tasks across production, art, and engineering. The senior advisor introduced the named ownership model as a lightweight protocol alongside a production channel communication structure.

## Applicability

- Relevant when: a studio has tasks that are "everyone's responsibility" and therefore no-one's -- a single named owner per task converts shared responsibility into accountable ownership.
- Relevant when: P0 escalations are not being actioned above other work -- naming a red ball removes ambiguity about what "urgent" means for the specific named owner.
- Relevant when: introducing a new production protocol -- prototyping within a small production team before rolling out with champions prevents a failed studio-wide rollout.
- Relevant when: production channels are noisy because content is duplicated across multiple channels -- centralised broadcast with links preserves signal quality.
