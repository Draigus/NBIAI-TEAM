---
source: granola
source_id: not_6x2qVT5iMSaKzn
source_path: https://notes.granola.ai/d/029d8973-a1d9-4747-8ce2-d1c4dcb3e4d7
ingested: 2026-07-24
topics_detected: [investor-showcase, vertical-slice, technical-risk, fundraising]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [games_pitch_decks, client_couch_heroes, forecast_models]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: insight
---

# Investor Demo with Incomplete Technical Features: Transparency and Workaround Model

## Key Content

When a critical technical feature is unlikely to be ready for an investor showcase, the recommended approach is explicit disclosure paired with a functional visual workaround -- not hiding the gap or delaying the demo.

**The instancing pattern:**
- Instancing (seamless zone transitions in an MMO) is a novel technical challenge for most game engineering teams
- If instancing is not ready for the investor demo: implement a black screen fade-out/fade-in transition between maps
- Explicitly tell investors: "We're still working on instancing" rather than papering over the gap
- Investors respond better to candour about known risks than to discovering concealed technical debt post-investment

**Why transparency works here:**
- Investors in game studios understand technical risk as a normal part of the investment thesis
- Concealment risk: if discovered later, it damages trust more than the gap itself
- A visible workaround with an honest caveat demonstrates engineering maturity (we know what we don't know)

**Fundraising timeline constraint driving VS deadline:**
- September vertical slice deadline is not arbitrary -- it is the enabler for a September fundraising start
- The investor showcase must precede the fundraising ask; delaying the demo delays the round
- Any scope that cannot ship by VS1 must be cut; it is not a "nice to have" schedule -- it is the fundraising trigger

**Risk register item:** identify the hardest technical feature that no team member has built before. If it's on the critical path for the demo, build the workaround before the demo date and disclose proactively.

## Decisions / Insights

- Studio leadership decided: instancing workaround (black fade + explicit disclosure) is the plan if instancing is not ready by September
- Studio leadership observed: investor showcases are investor-relationship tools, not marketing demos -- candour about known gaps is the right stance
- Studio leadership decided: September VS1 deadline is non-negotiable because it is the fundraising trigger, not a production milestone

## Context

1:1 between embedded CPO and engineering lead at a ~55-70 person MMO studio. 2026-07-24. Studio targeting September VS1 for an active investment round. Instancing identified as the highest back-end risk: novel technical challenge with limited internal experience. Most of the team has never built instancing before.

## Applicability

Relevant when: advising a studio on what to include in an investor demo -- identify technical gaps and build explicit workarounds with disclosure rather than hiding them.
Relevant when: a studio has a hard fundraising timeline -- the VS1 deadline is a financial trigger, not a production preference; treat it accordingly in scope decisions.
Relevant when: evaluating technical risk in a VS plan -- the "has anyone on this team actually built this before?" question surfaces investor-level risks that standard risk registers miss.
Relevant when: coaching a studio through investor relations -- proactive disclosure of known technical risks positions the team as credible and self-aware.
