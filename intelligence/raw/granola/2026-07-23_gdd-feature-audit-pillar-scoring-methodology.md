---
source: granola
source_id: not_wxY4jEVBZMQz1r
source_path: https://notes.granola.ai/d/a371e89b-ad7c-4c9f-bf68-f74aa37bb8ab
ingested: 2026-07-23
topics_detected: [gdd-audit, feature-prioritisation, game-pillars, pre-production]
relevance_score: 9
novelty_score: 8
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# GDD Feature Audit Against Game Pillars: Keep / Defer / Cut Framework

## Key Content

Pre-VS feature audit process for studios with accumulated GDDs that have never been checked against design pillars or vision:

**Problem pattern:** GDDs written over years become inconsistent, incomplete, and disconnected from current pillars. Features accumulate without clear design intent (cited example: double jump -- present in backlog with no articulated rationale). For every visible "shark" in the backlog, assume three more lurking.

**Audit process:**
1. Head of Design audits each feature against game pillars and vision
2. Score each feature on pillar alignment
3. Decide: keep (VS or post-VS), defer (named phase), cut (backlog cleared)
4. Restructure the knowledge tool (e.g., Confluence) with stage templates
5. Write critical missing design docs before VS completion, not after
6. Feature backlog review uses an existing game systems map as the starting frame

**Organisational prerequisites:** the auditing role (here: Head of Design) must not be responsible for VS execution simultaneously -- design audit and VS delivery are conflicting workloads. VS stays Robin-led; design audit is a separate mandate.

Scope of the audit: GDDs, feature descriptions, and implicit features (things present in the codebase or backlog without a design doc).

## Decisions / Insights

- Glen decided: GDD audit must be completed pre-VS to avoid inheriting undefined scope into the next phase
- Simon (Head of Design) observed: for every visible feature without design intent, likely three more lurking in the backlog
- Glen concluded: the auditing designer should not be running VS execution concurrently -- the two mandates conflict
- Pattern identified: studios consistently accumulate features without articulating why the feature exists or how it serves the core game loop

## Context

Design clarity session between Glen Pryer (CPO/NBI) and Simon Woodruff (Head of Design, CH). 2026-07-23. CH is mid-VS on an MMO with 4+ years of design history including combat rebuilds, platform pivots, and brand changes. Multiple GDDs exist in Confluence; none have been scored against the current pillars.

## Applicability

Relevant when: a studio is approaching a major milestone (VS, alpha, beta) with a backlog that has never been audited against its current design pillars.
Relevant when: a Head of Design is being onboarded to an existing codebase/backlog and needs a structured approach to gaining authority over scope.
Relevant when: a studio has multiple legacy GDDs that pre-date a creative direction change -- audit against current pillars to identify orphaned features.
Relevant when: a client studio's backlog appears manageable on the surface but the team cannot articulate why individual features exist.
