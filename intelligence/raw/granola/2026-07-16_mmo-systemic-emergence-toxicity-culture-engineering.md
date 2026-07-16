---
source: granola
source_id: b058801b-c193-486f-a824-be3c89e598f8
source_path: https://notes.granola.ai/d/b058801b-c193-486f-a824-be3c89e598f8
ingested: 2026-07-16
topics_detected: [mmo-design, systemic-design, emergence, toxicity, community-culture, live-service]
relevance_score: 9
novelty_score: 8
actionability_score: 8
bank_candidates: [client_couch_heroes, production_methods]
new_bank_suggestions: [games_design]
sensitivity_class: client_scoped
extract_type: insight
---

# MMO Systemic Emergence, Viral Moment Architecture, and Toxicity R-Value Engineering

## Key Content

Three interconnected design principles for building a content-generating MMO:

**Systemic emergence over scripted content:** Design verbs and rules that work consistently everywhere; outputs of one system feed the next. Fire burns flammable things; climbing works on all surfaces. Sea of Thieves model: water + wind + skeletons + ships + storms + night = near-infinite combinations. New monsters built by assigning data values to shared components, not rebuilding from scratch. Consistency is the magic circle -- breaking rules shatters the emotional contract with the player. Only simulate what is noticeable and interesting (story logic, not physics simulation).

**Viral moment architecture:** Systemic games generate shareable moments; scripted games peak at launch and disappear. Leroy Jenkins, the Corrupted Blood plague -- both emergent, both iconic. Design for the "Bob the Hoenator kills a world boss with a hoe of destruction" possibility. Specific mechanics: kill-tag awarded to last hit (not most damage), enabling unexpected weapons to claim kills; body-fly distance on death set to 300 yards for shareable spectacle. Players generate content for each other -- the game creates conditions, not scripts.

**Toxicity R-value modeling:** Toxic behaviour spreads like a virus with an R-value; 5% infects 8%, cascades further. R-value modeling built at Blizzard with UCLA researchers, refined at Xbox. High-tempo games produce higher toxicity by design. Culture is set by early audience and what gets highlighted -- not by rules and sticks. Broken windows theory applies: bad behaviour feels wrong in a nice environment where no one else does it. Sea of Thieves Pirate Code megaphone at session start dramatically reduced toxic events. Shadow-muting as a tool: toxic players shout into a void; existing community redirects them naturally. Infamy systems backfire -- approximately 8% of players race to the top of any negative scale simply because it exists.

## Decisions / Insights

- Studio CPO concluded: systemic design is the correct architecture for content longevity; scripted content exhausts on launch, systemic content compounds over years.
- Studio CPO concluded: viral moments must be architecturally possible, not scripted; kill-tag and body-fly distance are two specific implementation decisions that enable them.
- Studio CPO concluded: toxicity R-value is the correct framing for community culture design; early audience selection and what gets highlighted matters more than in-game penalty systems.
- Studio CPO observed: infamy systems reliably produce an infamy-seeking minority -- a villain leaderboard is a villain game for ~8% of players; do not create it.
- Studio CPO observed: Fortnite forced-concert counterexample -- removing player autonomy (forced to watch, cannot leave) spiked toxicity; autonomy is a precondition for positive community norms.

## Context

Design session notes by studio CPO at a ~70-person MMO studio, 16 Jul 2026. CPO drawing on direct experience at Blizzard (R-value modeling collaboration with UCLA) and subsequent Xbox work. Session covered systemic vs. scripted architecture, player content generation, and community culture engineering as interconnected design decisions for the studio's MMO in development.

## Applicability

Relevant when: advising a studio on content longevity strategy -- systemic design with consistent rules compounds content generation over years; scripted content has a fixed depletion curve; the architectural decision must be made before production, not after launch.
Relevant when: a studio is building community management policy -- R-value framing reframes the problem from "punish bad behaviour" to "reduce the reproduction number"; early culture decisions (what gets highlighted, who the first audience is) have outsized impact.
Relevant when: reviewing a game's social systems design -- test for infamy system backfire risk; any leaderboard or ranking based on negative behaviour will attract approximately 8% of players as a feature, not a bug.
Relevant when: advising on live service design for longevity -- systemic games continue generating Twitch and community content years after launch; scripted games require expensive content drops to maintain the same visibility.
Relevant when: designing combat kill attribution -- last-hit kill-tag (not most-damage) enables unexpected weapon types to generate viral moments; a seemingly minor implementation decision shapes the game's content-generation potential.
