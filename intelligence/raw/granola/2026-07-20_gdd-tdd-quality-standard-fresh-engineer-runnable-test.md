---
source: granola
source_id: not_9nQcKcphTysGNd
source_path: https://notes.granola.ai/d/6ad30ef0-667c-4c82-9268-58fceef957b6
ingested: 2026-07-21
topics_detected: [gdd, tdd, documentation-standards, production-methodology, game-design]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# GDD and TDD Quality Standard: The Fresh Engineer Runnable Test

## Key Content

Practical quality bar for Technical Design Documents and Game Design Documents in game studios:

**TDD standard ("fresh engineer runnable test"):** A TDD must let a new engineer pick up and execute the feature without re-reading the meeting transcript that spawned it. If the transcript is a required input to understand the task, the TDD has failed.

**GDD standard:** A GDD should be a structured design document, not a command list. Specific failure mode observed: a guild system GDD was a list of commands, not a design rationale. Broken internal links (ClickUp) compounded the review difficulty.

**Template-first remediation approach:**
1. Pick one representative TDD; bring it to full spec manually.
2. That corrected document becomes the template; all subsequent TDDs follow it.
3. Run existing GDD content through AI to convert structure (80% mechanical lift); human authors retain design content.
4. Assign GDD standards to the Head of Design as a named accountability.

**AI-assisted templating caveat:** AI can fill a template structure; it cannot write the design. The template scaffolding is the correct AI application; design rationale must remain human-authored.

**Reference tool:** Jasper's 22-page game-dev GDD template on GitHub (built at Triarch) cited as a starting point for GDD templating exercise.

## Decisions / Insights

- Glen decided: TDD bar is the fresh engineer test -- if the transcript is required, the TDD is incomplete.
- Pattern: existing GDDs that are command lists not design docs are a high-volume problem; batch conversion via AI templating is the practical fix, not individual rewrites.
- Pattern: broken documentation links (ClickUp/Confluence) mask the quality problem; fixing links reveals how thin the docs actually are.
- Graeme decided: GDD templating exercise to be assigned to production coordinator (Valeria); Head of Design held accountable for GDD quality once pillars are landed.

## Context

Production meeting at a ~55-person MMO studio, 20 Jul 2026. TDD/GDD quality surfaced when EP reviewed a guild system TDD and found it shallow; cross-reference to the GDD found it was a command list with broken links. Studio is ~8 weeks from an investor vertical slice; documentation quality directly affects whether engineering can execute without repeated clarification meetings.

## Applicability

Relevant when: auditing a studio's technical documentation during an engagement -- apply the fresh engineer test to 2-3 TDDs as a quality signal; failure rate predicts engineering re-work volume.
Relevant when: a studio needs to improve GDD/TDD quality fast -- the template-first approach (fix one, scale from it) is faster than a wholesale documentation project.
Relevant when: a studio wants to use AI for documentation -- AI for template structure is valid; AI for design content is an IP and quality risk.
Relevant when: a new EP or Head of Design joins a studio -- GDD standard ownership is a key early accountability to assign; leaving it unassigned means it defaults to no one.
