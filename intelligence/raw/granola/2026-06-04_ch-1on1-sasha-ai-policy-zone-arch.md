---
source: granola
source_id: granola_dc715a3c
source_path: granola://meetings/dc715a3c-7603-4bcd-91de-99a0bdae37e4
ingested: 2026-06-11
topics_detected: [ai-policy, zone-architecture, art-direction, build-pipeline, vacation-policy]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: [ai-policy-games-studio]
sensitivity_class: client_scoped
extract_type: decision
---

# CH 1:1 Sasha — AI Policy by Discipline, Zone Architecture, Build Issues

## Key Content

1:1 with Sasha Krieger (Lead Concept/Environment). AI policy framework developed per discipline: Code team — juniors write own code, AI for cleanup/review only; not for base code, features, or server architecture. Design team — AI for research, ideation, red-teaming; not for core documentation. Art team — AI acceptable for concept art initial ideas, colour options, prop concepting, keyframe animation, Claude for VFX tool work; Sasha personally strongly against AI for art. Zone population architecture: target 200–300 players per zone with headroom; sharding at 100+ cluster threshold — spin off combat encounters to separate shards, maintain unified chat/friends across shards. Server cost consideration: data centres vs AWS (30% cost difference); current VMs at £4,000/month. Build system problem: tutorial cave disconnected from main level, portal systems non-functional, main branch constantly buggy (everyone working on it). Merging takes 4–5 hours due to Conrad's 80,000-file optimisation. Needed: unified level with working components for vertical slice (Shortleak + Downtime in one map). Vacation policy needed: grandfather existing requests; no new vacation requests until end of August; manager discretion for 3-day weekends if milestones unaffected.

## Decisions / Insights

- [Glen/Sasha] decided: AI policy by discipline — augmentation for art/design/cleanup; not for base code, architecture, or core art creation
- [Glen] confirmed: 200–300 players/zone target with sharding at 100+ combat cluster
- [Glen] decided: unified level needed for vertical slice (Shortleak + Downtime in one map)
- [Glen] decided: vacation freeze until end of August; grandfather existing approved requests
- [Glen] identified: Conrad's 80,000-file optimisation created a merge bottleneck — must be flagged to Mustafa

## Context

1:1 with Sasha Krieger (Lead Concept/Environment Art), 4 June 2026.

## Applicability

- Relevant when: designing an AI policy for a creative studio with mixed discipline teams (differentiated rules by craft)
- Relevant when: architecting zone population systems for an MMO with sharding (200–300 median, shard at 100 combat)
- Relevant when: diagnosing build pipeline slowness caused by asset count explosion from a single optimisation pass
- Relevant when: implementing a vacation freeze policy during vertical slice crunch without breaking morale
