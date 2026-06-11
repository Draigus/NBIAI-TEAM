---
source: granola
source_id: granola_2dc99779
source_path: granola://meetings/2dc99779-bade-458f-9019-fe09872ad8f4
ingested: 2026-06-11
topics_detected: [production-planning, build-pipeline, player-scale, downtime-design, studio-hiring]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: insight
---

# CH Directors/Leads Weekly Sync — Performance Targets, Build Pipeline, Downtime

## Key Content

Large leadership sync. Key items: (1) Player scale: 200 per zone (median), 100 concurrent open-world combat before sharding confirmed; no one pushed back; scaling beyond 200 not committed until 200 validated. Performance priority order: rendering first, then networking. Downtime flagged as hardest benchmark — full of marketplace assets, not optimised. Player character optimisation (garments, forge combos, texture atlases) will have major draw call impact. (2) Build pipeline: UGS (Unreal Game Sync) recommended — live branch, visual commit tracking, no per-machine compiles; full setup deferred to DevOps hire. Bi-weekly build cadence (every sprint), not weekly. Build runs on its own branch, not main. (3) Downtime redesign: Gary, Michael, and Robin to explore faster/smarter layout; current scope may be too large for vertical slice timeline; Downtime must appear in VS — it's a cornerstone of the player promise. (4) Art department: geo vs displacement tradeoff for brick ruin kit under review (geo looks better but Nanite performance impact needs testing). VFX: foam corruption playable, oily/blobby material still needs visual direction. (5) Jira admin: one strong candidate interviewed; want to move fast.

## Decisions / Insights

- [Glen/team] confirmed: 200 players/zone median, 100 combat cap, rendering before networking
- [Glen/Mustafa] decided: bi-weekly build cadence on dedicated branch; UGS setup post-DevOps hire
- [Glen/Vardis] decided: Downtime must appear in vertical slice regardless of scope pressure
- [Glen] decided: DevOps hire to be accelerated given build pipeline dependency
- [Mustafa] flagged: engineers currently context-switching into IT/infra support — DevOps gap is real

## Context

Directors/Leads Weekly Sync, 9 June 2026. Full CH directors and leads group (14 attendees).

## Applicability

- Relevant when: setting player capacity targets for an MMO vertical slice (200/zone median is the CH target)
- Relevant when: designing a studio build cadence during pre-production to early production transition
- Relevant when: advising on UGS adoption for a mid-size Unreal studio without a DevOps function
- Relevant when: prioritising performance optimisation order (always rendering before networking)
