---
source: granola
source_id: granola_879d2fbb
source_path: granola://meetings/879d2fbb-1803-41b0-ab3a-3213b86e70f2
ingested: 2026-05-28
topics_detected: [hiring-interview, fullstack-developer, mmo-architecture, backend-engineering, portal-system, couch-heroes-hiring]
relevance_score: 7
novelty_score: 8
actionability_score: 6
bank_candidates: [client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: confidential
extract_type: insight
---

# Lead Full Stack Developer Interview -- Sergii Fedorov

## Key Content

Sergii Fedorov, backend engineer based in Helsinki, Finland. 15+ years experience transitioning from banking (2000) to game development (2011). Career: Playtech (2011-2021, shared cloud services, Java), Seriously (mobile, built Battle Pass generating 10-15% of total revenue), Rovio (Angry Birds Friends cleanup -- reduced GCP costs from EUR 60K to EUR 22K/month, migrated GCP to AWS), Supercell (Brawl Stars backend, SpongeBob collaboration), Northern Stars (tower defense startup, blue-green deployments, Bicep to Terraform rewrite, one-click environment deployment), Finplay (iGaming, consolidated fragmented mono-repo across 40 developers), Epic Games (current -- Save the World F2P migration).

MMO backend architecture philosophy: core game servers (spawning pools with pre-loaded instances), persistence layer, identity system, commerce, analytics, replay/spectator, operations/monitoring. Feature-based slicing over rigid monolith vs microservices -- analyse data flow to determine service boundaries.

Performance troubleshooting methodology: infrastructure checks, application logs (ElasticSearch), network connectivity, player reports, gradual rollout (1-5% of servers). Replication problems: malicious packets, versioning mismatches, delta replication, authority model.

Portal system architecture discussion: cross-engine support (UE + Unity), asset management for 2GB+ games, middleware layer for exe transitions, telemetry optimisation with radial triggers for pre-warming, SDK requirements for partner studios, entitlement system for cross-game assets.

Platform targets: PC first, Xbox and PlayStation (no Switch/mobile). Team: 50 people currently, scaling to ~120 at launch, ~150 max. Engineering: 7 currently, 14-15 at launch. Launch target: 2028-2029 with EUR 140M+ funding secured.

Salary expectation: EUR 140K annually (above current budget range). Notice period: one month. High interest due to novel inter-game communication challenge.

## Decisions / Insights

- [Sergii] demonstrated: strong backend architecture knowledge with relevant game industry experience
- [Sergii] insight: feature-based service slicing over rigid monolith/microservices dichotomy
- [Sergii] stated: salary expectation EUR 140K (above budget range)
- [Glen] shared: EUR 140M+ funding secured, launch target 2028-2029, scaling to ~150 people
- [Glen] insight: portal system prototyping needed early to avoid late-stage integration issues
- [Sergii] demonstrated: cost optimisation track record (Rovio GCP EUR 60K to EUR 22K/month)

## Context

Interview on 15 April 2026. Participants: Glen, Jack Baxter, Sergii Fedorov (sergii.s.fedorov@gmail.com). Technical interview for Lead Full Stack Developer covering MMO architecture, performance debugging, and portal system design.

## Applicability

- Relevant when: making full stack developer hiring decisions at Couch Heroes
- Relevant when: designing MMO backend architecture and service boundaries
- Relevant when: planning portal system technical architecture
- Relevant when: benchmarking senior backend engineer compensation (EUR 140K)
- Relevant when: understanding Couch Heroes team scaling plans (50 to 150 people)
