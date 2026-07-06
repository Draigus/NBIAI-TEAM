---
source: granola
source_id: 61c67eb9-c9cb-4113-a638-c72e9dc05d85
source_path: https://notes.granola.ai/d/61c67eb9-c9cb-4113-a638-c72e9dc05d85
ingested: 2026-07-06
topics_detected: [unreal-engine, plugin-evaluation, combat-system, methodology, engineering-design, animation]
relevance_score: 7
novelty_score: 8
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Structured Unreal Engine Plugin Evaluation Methodology

## Key Content

A structured approach for evaluating a third-party Unreal Engine plugin before deciding whether to integrate, harvest from, or reject it:

**Evaluation setup:**
- Install plugin in a blank standalone Unreal project (not the game build); no game dependencies required
- Team: 2 designers + 1 coder for initial assessment; game director and creative director review separately afterwards
- Time budget: approximately 3 days total (1 day design, 1 day tech, 1 day GD/CD review)

**Design assessment deliverable:**
- Feature-by-feature like/dislike breakdown produced by the design team
- Video footage of desired features captured for engineering reference -- prevents misinterpretation in written handoff

**Engineering assessment:**
- Map each desired feature to one of: already have it / don't have it / can harvest code or assets from the plugin
- Network and memory profile assessed with the network engineer specifically
- For online/MMO context: explicitly confirm the plugin was designed for the replication scale required (e.g. 200+ players); most plugins are not

**Animation harvesting as a parallel track:**
- Plugin example projects often include animations and rigs that can be retargeted quickly (~1 hour per animation with a tech animator)
- Harvest as vertical slice placeholders; flag all for post-VS replacement (copyright risk unless licence confirmed)
- Licence check first: confirm redistributability and credit requirements before any assets enter production

## Decisions / Insights

- Glen decided: plugin to be evaluated in a blank standalone project; not integrated into the game build until evaluation is complete.
- Glen decided: design and engineering evaluate independently before GD/CD review; no combined single-session assessment.
- Glen identified: the real underlying problem was that designers had not given specific, candid feedback on the existing custom system -- the plugin request was a proxy for that unsaid feedback.
- Glen decided: force an honest feedback session between design leads and engineering on the existing system before the plugin evaluation proceeds.

## Context

Combat Abilities System Decision Call at a ~55-person MMO studio, 6 Jul 2026. The call arose after a design team request to evaluate ACF (Ability Component Framework) as a potential combat system base. Engineering had already built significant combat functionality; designers were unaware of what existed.

## Applicability

- Relevant when: a design team is requesting a third-party plugin without having given candid feedback on the existing system -- the plugin request is often a proxy for "the existing system does not meet our needs."
- Relevant when: evaluating any Unreal plugin for an online multiplayer game -- network and replication fit is not guaranteed; it must be assessed explicitly with the network engineer, not assumed from the plugin's documentation.
- Relevant when: a team is considering integrating a large systemic plugin -- a 3-day standalone evaluation (design + tech + director review) is a minimum viable process before any integration decision.
- Relevant when: evaluating a plugin for a vertical slice with limited animation resource -- animations in plugin example projects are usable as placeholders if the licence permits redistribution.
