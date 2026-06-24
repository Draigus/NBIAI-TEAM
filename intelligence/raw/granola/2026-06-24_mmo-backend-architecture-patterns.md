---
source: granola
source_id: 3cadc973-a9e9-4a50-ab82-923cec554af6
source_path: https://notes.granola.ai/d/3cadc973-a9e9-4a50-ab82-923cec554af6
ingested: 2026-06-24
topics_detected: [mmo, backend, architecture, server, microservices, sharding, networking, technical]
relevance_score: 7
novelty_score: 7
actionability_score: 7
bank_candidates: [client_couch_heroes]
new_bank_suggestions: [game_technical_architecture]
sensitivity_class: anonymisable
extract_type: insight
---

# MMO Backend Architecture Patterns: Topology, Protocol, and Persistence

## Key Content

Consolidated technical patterns from two senior MMO backend practitioners (anonymised), validated across multiple large-scale online titles:

**Server topology:**
- Hybrid architecture preferred over pure microservices or pure monolith. Pure microservices are over-abstracted; pure monolith creates cascading failure risk. Hybrid: services isolated enough to resource-manage independently, but without full distributed systems overhead.
- Pragma cited as a working example of this hybrid pattern.

**Protocol split:**
- UDP for high-frequency gameplay traffic (movement, combat, replication) where packet loss is acceptable.
- TCP/WebSocket for transactional and social traffic (economy, purchases, grouping, quest state) where events cannot be lost.

**Persistence model (three-tier):**
- Sharding: player grouping across VMs/shards based on population.
- Spanning: load balancing CPU and storage across player states.
- Persistent shard: player-specific world state (e.g. a burned house persists per account, not per session).
- High-permutation persistent world state (e.g. quest-state sharding: "burning Orgrimmar") is as much a design constraint problem as a technical one.
- Seamless shard migration is the goal; group members must stay co-located on the same instance.

**Data tier:**
- SQL (Postgres/MySQL) for economy and transactional data.
- NoSQL (MongoDB) for less critical, flexible data.

**Server authority:**
- Strongly server-authoritative. Client handles cosmetics only.
- Movement: "trust but verify" (speed threshold checks, not full resimulation). Economy, damage, purchases: always server-side.

**Scalability principle:** design for scale from the start. Retrofitting is significantly more expensive than building in the capability early, even at lower scale.

## Decisions / Insights

- Both practitioners independently concluded: microservices are over-abstracted for games at this stage; hybrid gives fault isolation without the coordination overhead.
- Both concluded: C++ only for performance-critical movement servers; Go or .NET preferred for backend services.
- Both observed: cloud-first with managed load balancing and auto-scaling is preferred over self-managed infrastructure.

## Context

Two separate technical interviews conducted by NBI on 2026-06-24, both focused on senior backend roles at a ~55-person MMO studio. Candidates drawn from backgrounds including large online shooter teams (40+ engineers) and naval simulator with 50-ship physics replication. Technical views have been consolidated and anonymised; specific candidate identity and outcome are restricted.

## Applicability

- Relevant when: advising a studio on MMO backend architecture choices -- the hybrid topology + protocol split is the battle-tested pattern at scale.
- Relevant when: reviewing a studio's server architecture proposal -- check whether they have a clear model for persistent world state and player-specific shard behaviour.
- Relevant when: a studio debates microservices vs. monolith -- the hybrid model with service isolation is the standard resolution; pure microservices is over-engineering for game backends.
- Relevant when: assessing technical leadership candidates for online game roles -- alignment on server authority model (cosmetics client-side, everything else server-side) is a quick calibration signal.
- Relevant when: reviewing infrastructure plans -- cloud-first managed scaling is the default; self-managed load balancing is a red flag for a studio of under 200 engineers.
