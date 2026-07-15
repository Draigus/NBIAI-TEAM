---
source: granola
source_id: 8850fa28-a4b2-43f2-a8ce-0a26e31f3de6
source_path: https://notes.granola.ai/d/8850fa28-a4b2-43f2-a8ce-0a26e31f3de6
ingested: 2026-07-15
topics_detected: [game-design-pillars, language-precision, alignment, studio-vision, archetype-testing]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: [games_design]
sensitivity_class: anonymisable
extract_type: methodology
---

# Pillar Language: Archetype Bias and the Precision Test

## Key Content

Game design pillars frequently inherit language from their author's player archetype. The shorthand that resonates for one player type actively excludes others -- and the excluded archetypes are often larger segments of the target audience.

**Common failure modes observed in one studio's pillar review:**
- "No gear treadmill" -- intended to mean "gear shouldn't gate you out of content if you haven't grinded." Actually reads as "no gear progression at all" to achievers and combat-focused players.
- "No endless grinding" -- intended to reduce mandatory daily obligation. Actually alienates players who treat grinding as their primary game loop.
- "No daily quests / finish lines" -- intended to mean no mandatory daily login. Contradicts a leveling system with an endpoint (which does exist).

**Root cause:** aspirational language written from a single archetype's POV, then generalised as studio-wide direction. New hires receive this as gospel in onboarding documents, encoding the bias into the culture.

**Precision test:**
1. For each pillar, write "what this means" for each major player archetype (achiever, combat-focused, cosmetics-motivated, casual social)
2. If meanings diverge, the language is broken -- rewrite to capture the intent, not the author's shorthand
3. Add "is / is not" examples to each pillar: explicit statements of what the pillar does and does not rule out
4. Retire any source document used as pillar language if it predates the precision test

## Decisions / Insights

- Studio CPO decided: original founder onboarding document using this pillar language must be retired as a source; new hires are being sent aspirational shorthand as design authority.
- Studio CPO observed: "If we give these words to our world, our world will build to these words" -- imprecise pillar language generates imprecise design decisions downstream.
- Head of Design agreed: the word "treadmill" in "no gear treadmill" is the problem, not gear progression itself; rewrite required to separate the objection from the mechanism.

## Context

1:1 between Head of Design and CPO at a ~70-person MMO studio, 15 Jul 2026. Head of Design had merged three prior pillar documents (from CEO, Game Director, and Head of Design) into one unified draft. The pillar language precision review surfaced that several phrases had been pulled from a CEO-authored new hire onboarding document and were encoding the CEO's player archetype biases as studio-wide gospel. A full leadership alignment session was scheduled for the following day.

## Applicability

Relevant when: reviewing a studio's design pillar document before a leadership alignment session -- run the multi-archetype precision test on each pillar before the session, not in it.
Relevant when: a studio's design decisions keep conflicting with stated pillars -- diagnose whether the pillar language is precise enough to function as a decision razor, or whether it's aspirational shorthand.
Relevant when: advising a studio on onboarding materials -- any document that uses pillar language without precision tests will encode the author's archetype bias into new hires' mental models.
Relevant when: a game's design skews unexpectedly toward one audience -- trace back to pillar language authored by leadership with a single player profile; the bias usually starts there.
