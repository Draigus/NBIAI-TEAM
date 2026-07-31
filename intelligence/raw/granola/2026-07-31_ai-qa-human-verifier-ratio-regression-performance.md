---
source: granola
source_id: not_AX0Z5GPApGumbx
source_path: https://notes.granola.ai/d/fef7b73e-0069-40ca-81b4-776a4c82d2b2
ingested: 2026-07-31
topics_detected: [qa, ai-tools, human-in-the-loop, regression-testing, game-production]
relevance_score: 9
novelty_score: 8
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# AI QA Framework: 4 Human Verifiers to 40 AI Agents, Segregated by Test Type

## Key Content

AI in game QA is viable at scale with human-in-the-loop constraint and strict use case segregation.

**Ratio model:** approximately 4 human verifiers supervising ~40 AI agents (10:1 AI-to-human). Hard constraint: AI must always have a human overseer -- never fully autonomous.

**Use cases where AI adds value:**
- Repetitive regression testing: same checks run 100+ times, same pass/fail criteria -- AI handles this reliably
- Performance testing: historically a major time sink, especially in VR and high-polycount environments -- AI runs continuous benchmarks

**Use cases to keep human:**
- Ad hoc and exploratory testing: requires reasoning, discovery, and judgment about what's wrong
- Anything requiring contextual understanding of "does this feel right as a player"

**In-game bug logging tool:** build or integrate an applet that captures screen state + data set and logs directly to Jira. Standard practice in AAA production. Enables player-submitted bug reports at PTR/beta stage with automated deduplication (WoW PTR model).

**Research signal:** no single dominant AI QA vendor as of July 2026; primary candidates in regression automation and performance testing.

## Decisions / Insights

- CPO decided: AI for bug identification and bug creation is acceptable if a human reviews each output
- QA lead preferred: regression and performance as AI domains; exploratory testing remains human
- CPO noted: ~4 human verifiers to ~40 AI agents as the viable operating ratio
- CPO noted: in-game bug logging applet is standard practice on every title worked on in the last 10 years -- should be on the roadmap

## Context

1:1 between CPO and QA lead at a ~60-person UK/Cyprus MMO studio, July 2026. One QA person covering a team that needs ~20; 12 people added recently, 16 more proposed. Discussion of how to scale QA coverage before external vendor costs become prohibitive. Both parties to research top-rated AI QA tools in parallel.

## Applicability

Relevant when: advising a studio scaling QA faster than headcount allows -- AI regression testing reduces the headcount gap for repetitive checks.
Relevant when: a studio asks about AI in QA -- the 4:40 human:AI ratio and use case segregation gives a concrete framework for policy and planning.
Relevant when: designing a player-facing bug report pipeline (PTR, beta) -- in-game logging applet with Jira integration and deduplication is the industry standard, not a nice-to-have.
Relevant when: evaluating AI QA tooling -- focus evaluation criteria on regression automation and performance benchmarking; leave exploratory/experiential testing to humans.
