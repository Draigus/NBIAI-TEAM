---
source: granola
source_id: not_5AYNSavix0Mtl9
source_path: https://notes.granola.ai/d/dee96778-05f1-4fc9-a5d3-b0e076353b28
ingested: 2026-07-30
topics_detected: [vs1-scope, art-pipeline, character-systems, scope-management, garment-system]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: decision
---

# VS1 Scope Decision: Floating Armor Geometry Out of Scope on Garment System

## Key Content

Scope boundary decision made at a ~60-person MMO studio in vertical slice phase regarding an armor system:

**The technical structure:** Armor pieces in this game are floating geometry layered on top of garments, not garment replacements. This means reskinning every garment combination to account for floating armor pieces involves simultaneous changes to art (every garment variant), animation (any clipping/interaction), and programming (layering logic). Three departments.

**The scope decision:** Armor-on-garments is out of VS1 scope. The feature was never formally planned in the current scope -- it was raised mid-production by team members as a potential add. Art lead declined; Game Director agreed. CPO confirmed.

**Classification:** Scope creep. The request emerged without a design origin document. No one had formally specified armors as a VS1 deliverable.

**Hero NPC texture overhaul:** A separate decision on the same meeting -- a Hero NPC robot character will receive a texture overhaul only (stylised repaint, not full redesign). Avoids touching animations and rigging. This is the right scope-constrained approach when a character needs a visual update but its rig is stable.

## Decisions / Insights

- Studio art lead decided: floating armor geometry on garments is out of VS1 scope; reskinning all garment combinations impacts art, animation, and programming simultaneously
- Studio CPO confirmed: the feature was never formally scoped; its emergence mid-production is a scope creep pattern, not a late requirement
- Studio CPO decided: Hero NPC texture overhaul only (stylised repaint) rather than full redesign -- avoids touching animations and rigging where rig is stable

## Context

Working session between CPO and senior art lead at a ~60-person UK/Cyprus-based MMO studio, July 2026. VS1 scope had recently been formally cut. This meeting reviewed remaining scope concerns. Both decisions represent scope protection following the formal cut.

## Applicability

Relevant when: a studio is in VS scope review and a character system feature is raised informally -- cross-department impact analysis (art + animation + programming) is the test; if it touches three departments, it does not belong in VS without a formal design origin.
Relevant when: a team member requests armor or accessory layering on a garment-based character system for a VS -- the combinatorial art cost of reskinning garment combinations for floating geometry is consistently underestimated.
Relevant when: a character asset needs a visual update but the rig is stable -- texture overhaul only (stylised repaint) avoids touching animations and rigging while delivering a visible improvement.
Relevant when: scope creep appears mid-production as a "we should add this" without a design document -- the absence of a scoping document is evidence the feature was never formally planned; decline with that as the justification.
