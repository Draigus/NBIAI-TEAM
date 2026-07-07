---
source: granola
source_id: b090af79-79bf-4f9c-bf42-f4b44ad3f7d2
source_path: https://notes.granola.ai/d/b090af79-79bf-4f9c-bf42-f4b44ad3f7d2
ingested: 2026-07-07
topics_detected: [mmo-architecture, server-authority, anti-cheat, netcode, combat-systems]
relevance_score: 8
novelty_score: 9
actionability_score: 7
bank_candidates: [production_methods]
new_bank_suggestions: [mmo_technical_patterns]
sensitivity_class: public
extract_type: methodology
---

# MMO Server Authority Model: Client vs. Server Split

## Key Content

Full player simulation on the server is the ideal for security but not feasible at MMO scale. The correct split for a combat MMO:

**Server-authoritative (always):**
- Combat hit resolution, cooldown checks, range and line-of-sight validation
- AoE spatial partition lookup and conical hit check
- All outcome state (health, inventory, character progression)

**Client-side projection (responsiveness):**
- Ability visual effects (e.g. cone AoE rendered immediately on client)
- Client sends facing direction for targetless AoE; server resolves actual hits
- Client "hints" which enemies it believes it hit; server validates, does not trust

**Anti-cheat approach:**
- Malicious client injection is a certainty, not an edge case; design for it from day one
- Log cheat attempts silently; issue wave bans rather than real-time flags
- Real-time flagging exposes the detection logic and causes false positives

**AoE/targeting flow:**
- Single-target: client sends target ID; server checks cooldown, range, line of sight
- Targetless AoE: client sends facing direction; server spatial partition + conical check

**Divergence management:**
- Client and server state diverge more in MMOs than in smaller-scale games (less server time per player = bigger prediction windows)
- Making that divergence look good on the client is the core MMO-specific engineering challenge

## Decisions / Insights

- Architect concluded: server must sanity-check all client hints; never trust client-reported hit outcomes.
- Architect concluded: wave banning rather than real-time flagging is the correct anti-cheat posture for MMOs.
- Architect observed: "table stakes" principle -- players compare feel to the best games they have played, not to what is technically hard; the client experience must feel instantaneous even when server is authoritative.
- Architect observed: divergence management (making server/client state mismatch invisible to the player) is the core MMO-specific engineering challenge, distinct from smaller-scale multiplayer.

## Context

Technical interview with a candidate for a senior engineering role at a ~55-person MMO studio developing an Unreal-based MMO, 7 Jul 2026. Candidate has head-of-engineering experience at studios with MMO and mass-multiplayer titles. Discussion was unprompted deep-dive into architecture decision-making.

## Applicability

- Relevant when: designing combat systems for a persistent-world MMO -- the client/server split differs meaningfully from smaller-scale multiplayer titles.
- Relevant when: assessing an engineering candidate's MMO credibility -- ask them to describe the client/server authority model; correct understanding is a strong signal.
- Relevant when: a studio is evaluating its anti-cheat architecture -- wave banning and silent logging are the correct posture; real-time detection exposure is the common mistake.
- Relevant when: player feel in combat is lagging behind expectations -- diagnose whether the client projection layer is doing enough to mask server round-trip latency before assuming the server architecture is the issue.
