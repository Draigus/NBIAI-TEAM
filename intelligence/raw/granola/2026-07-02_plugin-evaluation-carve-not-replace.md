---
source: granola
source_id: 67ce6094-7770-4a69-a07e-2e7de1b07d1c
source_path: https://notes.granola.ai/d/67ce6094-7770-4a69-a07e-2e7de1b07d1c
ingested: 2026-07-02
topics_detected: [plugin-evaluation, unreal-engine, technical-architecture, asset-reuse, scope-risk]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Plugin Evaluation Methodology: Carve Assets, Do Not Replace Architecture

## Key Content

A reusable decision framework for evaluating third-party plugins when existing systems are already partially built.

**The mistake to avoid:** adopting a plugin as a system when existing systems already cover the same functional domain. Adopting it wholesale scraps invested work and creates new technical debt from the migration.

**The correct question:** "What can we extract from this plugin without replacing our architecture?"
- Identify the specific assets with value (e.g. animations, rigs, traversal logic)
- Layer them onto existing systems
- Reject the plugin as a system; accept specific components as inputs
- Apply the same evaluation to every candidate plugin before adding to the tech stack

**Evaluation red flags:**
- Plugin has been reviewed multiple times and rejected on each pass = strong signal against adoption
- Adoption cost exceeds value when measured against existing sunk systems (e.g. one year of traversal work)
- UE version upgrades (e.g. 5.8) flagged as not production-ready = defer upgrade decisions until art and tech have reviewed jointly; avoid unilateral decisions by one discipline

**Process:** set up a formal plugin review meeting with both art and engineering leads before making an adoption decision; avoid solo technical reviews that miss cross-discipline impact.

## Decisions / Insights

- Glen decided: ACF traversal plugin rejected; pull animations and rigs out of ACF, layer onto existing traversal systems instead of adopting ACF as the architecture.
- Glen concluded: UE 5.8 upgrade decision should have included art and tech input jointly; unilateral UE version decisions are a process failure.
- Glen observed: repeated plugin reviews resulting in rejection each time is a strong prior against adoption -- the sunk analysis cost reinforces the case for a clean architectural boundary.

## Context

1:1 between senior advisor and Art Producer at a ~55-person MMO studio, Jul 2 2026. Context: reviewing the traversal and combat plugin pipeline after a previous reject decision was being reconsidered.

## Applicability

- Relevant when: a studio is evaluating a third-party plugin against an existing system -- the carve-and-layer question should come before any adoption decision.
- Relevant when: advising a team that has reviewed and rejected the same plugin multiple times -- the pattern itself is evidence; recurring rejection is not an evaluation failure, it is the correct outcome confirming the architectural boundary.
- Relevant when: an engine version upgrade is being considered mid-production -- requiring joint sign-off from art and tech before any UE version decision prevents the upgrade from being treated as a purely technical choice.
- Relevant when: a studio is building its plugin evaluation process -- a formal cross-discipline review meeting before adoption is the structural fix that prevents unilateral decisions.
