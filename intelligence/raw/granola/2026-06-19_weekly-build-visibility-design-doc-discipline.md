---
source: granola
source_id: 149f89b3-fd34-4697-9b98-d95b75e07c4b
source_path: https://notes.granola.ai/d/149f89b3-fd34-4697-9b98-d95b75e07c4b
ingested: 2026-06-19
topics_detected: [build-management, visibility, design-process, technical-leadership]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: insight
---

# Weekly Build as Primary Visibility Mechanism + Design Doc Discipline

## Key Content
**Build visibility principle**: "I don't care what's in Jira or Perforce. If I can't play the game, it's not there." Weekly playable build is the foundation of studio state; Jira and other tracking tools only become meaningful once there is a stable build to anchor them to. Biweekly showcase-style demos are false confidence -- "pretty pictures" that don't represent game state. The sequence: get the build up weekly → then sprint retrospectives → then Jira becomes interesting.

**Design document discipline for engineering**: Engineers with deep domain knowledge tend to implement "known" features (e.g. group finder, dungeon finder) without a design document because they know how to do it. Rule: if engineering cannot receive a properly detailed design spec, they should push it back rather than half-ass the implementation. Even simple, known features require a design doc -- this creates accountability between design and engineering and surfaces when design is the bottleneck.

## Decisions / Insights
- Glen concluded: weekly playable build is the single most important visibility tool for studio leadership.
- Glen concluded: biweekly demos create false confidence; they do not represent real game state.
- Glen decided: engineering must push back on implementation requests that lack adequate design specification.
- Glen observed: design doc discipline protects engineering from being blamed for scope misalignment that originated in underspecified design.

## Context
1:1 with Head of Tech, 2026-06-19. Studio is transitioning from Perforce + Jira setup; first weekly build target is ~3 weeks out. Design team is being restructured with new senior hire to codify design process.

## Applicability
Relevant when: a studio's Jira/tracking system has low confidence because the underlying build state is unstable or invisible.
Relevant when: leadership is using showcase demos as a substitute for real game build reviews.
Relevant when: engineering is implementing features from verbal requests or rough direction rather than written design specs.
Relevant when: advising on what to fix first in a studio where process complexity exceeds the underlying delivery foundation.
