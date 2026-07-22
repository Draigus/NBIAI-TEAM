---
source: granola
source_id: not_HGYutc3kVGhUWy
source_path: https://notes.granola.ai/d/5351ffa0-6bf4-417c-8710-cec83b117b5f
ingested: 2026-07-22
topics_detected: [ue5-replication, gameplay-ability-system, mmo-technical, code-review, ai-in-dev]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: [mmo_technical_patterns]
sensitivity_class: internal
extract_type: methodology
---

# UE5 MMO Replication and GAS Architecture Patterns

## Key Content

Hybrid replication approach for ability-heavy MMOs: use Gameplay Ability System (GAS) for abilities, manual replication for lightweight high-frequency properties. GAS spreads into UI and movement if unchecked -- requires explicit containment strategy.

Prediction pain points in GAS: duration effects and ammo replication at high fire rates. For ammo, manual replication outperforms GAS at high fire rates.

Replication Graph preferred over Iris for production (Iris not production-stable until UE 5.8+). Replication Graph used on extraction game prototypes; Iris worth evaluating on personal projects for future readiness.

Blueprints vs C++: heavy logic and maths in C++; Blueprints reserved for designer tuning and prototyping. Strict discipline required or Blueprint logic drifts into engine-level concerns.

AI in development: treat AI output like a junior engineer -- high volume, mandatory review at every step. Useful for code volume, debugging, and red-teaming architecture; not for autonomous architecture generation.

PR size discipline: small PRs enforce code hygiene. Code reviewers share ownership of bugs in reviewed code -- builds shared accountability culture.

## Decisions / Insights

- Senior engineer assessed: GAS is best choice for ability-heavy MMOs; rolling custom framework wastes enormous engineering cost compared to adapting GAS
- Pattern identified: GAS "spreads like cancer" into unrelated systems without explicit boundary-setting in the initial architecture
- Pattern identified: ammo replication at high fire rates is a known GAS prediction failure mode; manual replication is the fix
- Senior engineer assessed: Iris replication is not yet production-ready (UE 5.8+); Replication Graph is the safe choice for shipping now
- Pattern identified: data-driven weapon modification system (visitor + chain of responsibility + Unreal instancing) dramatically accelerates content pipeline -- designers attach components to any weapon without engineering involvement

## Context

Technical assessment of a senior gameplay engineer candidate (anonymised) for an MMO project using Unreal Engine 5 with a ~5-6 person gameplay team. Candidate had 13+ years C++ experience across shipped MMO and AAA titles. Assessment covered replication, GAS, AI tooling, and engineering leadership. 2026-07-22.

## Applicability

Relevant when: hiring or onboarding senior UE5 engineers for an MMO project and assessing whether they have the replication and GAS depth required.
Relevant when: designing the replication architecture for an ability-heavy multiplayer game -- the hybrid GAS + manual approach applies broadly.
Relevant when: setting engineering AI policy for a game team -- the "treat AI as junior engineer" heuristic and mandatory review protocol is directly deployable.
Relevant when: structuring code review process in a small gameplay team to build shared ownership and reduce defect leakage.
Relevant when: evaluating whether to adopt Iris replication in a UE5 project -- the readiness timeline (5.8+) informs scheduling.
