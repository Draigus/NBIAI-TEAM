---
source: claude
source_id: handoff_2026-05-13_karpathy_capabilities
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-05-13_karpathy_capabilities.md
ingested: 2026-05-25
topics_detected: [ai-operations, karpathy-patterns, client-knowledge, autoresearch]
relevance_score: 9
novelty_score: 9
actionability_score: 8
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: [ai_capabilities]
sensitivity_class: internal
extract_type: methodology
---

# Karpathy-Derived Capabilities: LLM Wiki and AutoResearch

## Key Content

Researched Andrej Karpathy's patterns (AutoResearch, LLM Wiki, Software 3.0) and built two Claude Code skills plus an AI operations service offering. /compile-client implements the LLM Wiki pattern: compile a client document folder into a structured CLIENT_BRAIN.md knowledge base with source provenance tags. Tested on Goals Studio (28 files compiled). /autoresearch implements the autonomous iteration loop: scores documents against weighted criteria, makes atomic improvements until convergence. Three criteria sets: consulting (6 dimensions), pricing (6 dimensions), pitch (6 dimensions). Also created brain/services_ai_operations.md positioning NBI's AI ops capability as a sellable service, with competitive positioning against Sia/McKinsey/Cognizant/Google.

PlaySage received architectural guidance for "Software 3.0" patterns: LLM Wiki for market intelligence, LLM analysis layer, AutoResearch quality loops, agent swarm data collection.

## Decisions / Insights

- LLM Wiki pattern: compile once, load the artefact, never re-read raw sources every session
- AutoResearch pattern: score > improve > score > converge -- applicable beyond ML to any document quality
- NBI's AI operations capability is a sellable service, not just internal tooling
- Competitive advantage: NBI is studio-native (lives inside game studios) while Big4 consultancies are external
- Pricing framework uses NBI's existing Medium/Large tiers -- ranges TBD by Glen
- /compile-client should be run on Couch Heroes folder for the biggest payoff

## Context

This session positioned NBI's AI tooling as both operational infrastructure and a revenue-generating service offering.

## Applicability

- Run /compile-client on any client folder before starting sustained work with that client
- Use /autoresearch on consulting deliverables before client review
- AI operations pitch uses the template at templates/proposal_ai_operations.md
- PlaySage architecture should follow the Software 3.0 patterns documented in brain/playsage.md
