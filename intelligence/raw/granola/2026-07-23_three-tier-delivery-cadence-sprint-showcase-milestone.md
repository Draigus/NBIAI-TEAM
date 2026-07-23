---
source: granola
source_id: not_tWtAiezzkFgUle
source_path: https://notes.granola.ai/d/16e4909e-de62-4f31-b9f3-61ee3530bb73
ingested: 2026-07-23
topics_detected: [delivery-cadence, sprint-planning, milestone-structure, studio-rhythm]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Three-Tier Studio Delivery Cadence: Sprint / Monthly Showcase / Quarterly Milestone

## Key Content

Delivery cadence framework for a mid-size game studio where the game's rhythm must drive the entire studio's operational calendar:

**Tier 1 -- Two-week sprint:**
- Kickoff, planning, mid-sprint check-in, review, retro
- Standard agile structure; team-level coordination

**Tier 2 -- Monthly showcase:**
- Completed features shown to studio leadership
- Tracks incremental progress across sprints
- Forces the team to deliver something demonstrable each month, not just advance tasks

**Tier 3 -- Three-month milestone:**
- Full playtest delivering a complete player experience
- Investment round checkpoint (external-facing signal)
- Aligns with how the team has historically worked; restructuring within the existing cadence, not replacing it

**Governing principle:** the game sets the rhythm for the whole studio. Operations, HR, finance, and legal roadmaps must align to milestone windows. Performance planning goes into low-load sprint periods, not mid-sprint. Disruptive administrative activities (reviews, onboarding waves, etc.) are scheduled around game delivery, not the reverse.

**Critical gap identified:** teams delivering isolated features rather than coherent player experiences. Monthly showcase and quarterly milestone explicitly require a playable experience, not a feature checklist -- this forces cross-team integration earlier.

**Estimate pressure-testing:** a senior engineer's estimate of 1,600 days was reduced to 800 days in a single conversation by separating proxy completion (feature present, rough) from final quality (feature polished, ship-ready). Splitting the definition of done reveals hidden contingency in estimates.

## Decisions / Insights

- Glen decided: three-month milestone is the external-facing cadence; two-week sprints are the internal cadence
- Glen observed: if the studio doesn't define experience-level goals per build, teams deliver feature checklists and miss integration gaps until late
- Valeria (Head of Production) flagged: teams have been delivering isolated features, not coherent player experiences -- this is the primary delivery quality gap
- Pattern identified: splitting "proxy completion" from "final quality" in an estimate can halve the number without reducing actual scope -- it surfaces what was already in the contingency

## Context

Production health and delivery cadence session between Glen Pryer (CPO/NBI) and Valeria Trofimova (Head of Production, CH). 2026-07-23. CH is in VS. Backlog exists in Excel, not yet in Jira. Four producers now in place. Engineering on daily builds and Unreal 5.8 upgrade. Animation velocity still unconfirmed (suspected low since February). Glen building a studio rhythm PowerPoint for leadership.

## Applicability

Relevant when: a studio has no formal delivery cadence beyond sprint-level planning -- the three-tier model adds monthly and quarterly visibility without over-engineering.
Relevant when: a studio's operations, HR, or finance team is scheduling disruptive activities (reviews, onboarding) without regard to game delivery windows -- the "game sets the rhythm" principle provides the framing to push back.
Relevant when: a milestone review reveals the team has been delivering individual features without achieving coherent player experiences -- reframe milestone goals as experience targets, not feature completions.
Relevant when: an engineer or artist's estimate seems inflated -- split proxy vs final quality completion definitions before accepting the number.
Relevant when: an investment round checkpoint needs to align to a delivery milestone -- quarterly milestone is the natural external signal.
