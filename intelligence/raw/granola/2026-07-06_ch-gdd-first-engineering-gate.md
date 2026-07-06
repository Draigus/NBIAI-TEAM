---
source: granola
source_id: 61c67eb9-c9cb-4113-a638-c72e9dc05d85
source_path: https://notes.granola.ai/d/61c67eb9-c9cb-4113-a638-c72e9dc05d85
ingested: 2026-07-06
topics_detected: [gdd, design-process, engineering-gate, feature-pipeline, r-and-d-documentation, confluence]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# GDD-First Design Process and Engineering Gate Protocol

## Key Content

A design-gate protocol established at a ~55-person MMO studio to prevent engineering from building features without design documentation:

**Gate rule:**
- No new feature or system built without a design document (GDD entry or equivalent)
- Engineering instruction: if no GDD entry exists, kick back the request immediately
- Escalation path: if engineering is pushed to build without a GDD, escalate to the senior advisor
- Exception: small, obvious single-step requests; new systems and features always require documentation

**Feature pipeline sequence (fixed order):**
1. Creative Director vision -- what kind of game this is
2. Game Director direction -- how this feature fits the game
3. Design document (feature spec)
4. Technical Design Document (TDD)
5. Build

**R&D documentation requirement:**
- All plugin and technology evaluations documented in a dedicated R&D section on Confluence
- Each evaluation: findings, pros/cons, decision made, action points
- Prevents repeated evaluation of the same tool (a specific plugin had been evaluated 4-5+ times with no recorded decision)
- Final output goes to Confluence; working notes can go in task management tools or meeting recordings

**Communication:**
- Senior advisor to address the development team directly on the GDD requirement; not delegated to leads
- No exceptions negotiated with individual engineering leads; policy applies universally from announcement date

## Decisions / Insights

- Glen decided: GDD-first is non-negotiable; engineering instructed to kick back any request without a design document.
- Glen decided: the pipeline sequence is fixed -- creative director direction precedes game director direction, which precedes the design document.
- Glen decided: R&D section on Confluence for all plugin and tech evaluations; working notes are secondary, final outputs are mandatory.
- Glen decided: to address the development team directly (by end of day 7 July 2026) rather than routing the policy through leads.

## Context

Combat Abilities System Decision Call at a ~55-person MMO studio, 6 Jul 2026. Engineering had been building features and evaluating plugins without a design gate, resulting in wasted effort and repeated re-evaluation of the same tools. The gate protocol was established as an immediate policy change.

## Applicability

- Relevant when: engineering is building features without design documentation -- the gate must be communicated from a senior position with a named escalation path; policy without an escalation path is not enforced.
- Relevant when: a studio repeatedly evaluates the same plugin or technology -- an R&D Confluence section with mandatory recorded outputs prevents cycle waste.
- Relevant when: a creative director and game director are not sequencing their directions clearly -- the GDD pipeline makes creative direction a prerequisite for game direction, which is a prerequisite for design documentation.
- Relevant when: establishing production discipline at a rapidly growing studio -- a simple kickback rule ("no GDD, kick it back; escalate to CPO if pushed") is lower-friction than a full process overhaul and can be communicated in a single studio-wide message.
