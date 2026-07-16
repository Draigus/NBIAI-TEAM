---
source: web_research
source_id: web_2026-07-16_production-alchemist-agile-dual-track-scrum-kanban
source_path: https://www.productionalchemist.com/p/production-101-12-agile-for-game
ingested: 2026-07-16
topics_detected: [agile, scrum, kanban, sprint-planning, live-ops, creative-work-estimation, dual-track, definition-of-done, cross-discipline]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: public
extract_type: framework
---

# Production Alchemist -- Dual-Track Agile for Game Producers (Scrum + Kanban)

## Key Content (max 200 words)

Rob Sandberg (Production Alchemist newsletter) identifies three structural points where standard Scrum breaks down in game development, and argues for a dual-track system as the practical resolution.

**Where Scrum breaks for game teams:**
1. *Creative work decomposition*: Design and feel iterations resist precise estimation. "A weapon feel pass doesn't [have a fixed definition of done] -- you know it when it feels right." Sprint velocity becomes meaningless when the unit of work is undefined.
2. *Cross-discipline cycles*: Art (days to weeks per asset), design, and engineering operate on misaligned rhythms. Art teams finishing by Wednesday while engineering is mid-implementation creates artificial sprint boundary friction.
3. *Definition of Done complexity*: Game features exist in multiple completion states (grey-boxed, art-complete, audio-complete, balance-complete). A sprint "done" that means "grey-boxed" is not the same done as "shipped to production."

**The dual-track resolution**: Development teams run two-week Scrum-style sprints. Live operations and support work runs on Kanban flow with WIP limits and cycle time measurement rather than velocity. The two tracks synchronise through a shared development calendar rather than shared sprint planning.

**The GDD anti-pattern**: Treating a fixed Game Design Document as a requirements backlog while claiming Agile process is identified as the most common failure mode -- "effectively waterfall execution dressed as Agile."

## Decisions / Insights

- Two-week sprints are the stated studio standard; shorter cycles increase planning overhead without proportional feedback benefit in game development
- The creative decomposition problem is not solvable by better estimation -- it is solved by separating feel/iteration work from specification-able build work into different backlog types
- Kanban WIP limits surface creative blockages better than sprint velocity for live ops work: when the board stalls, the limit forces the team to diagnose, not defer
- Cycle time replaces velocity as the primary metric for Kanban tracks -- it measures how long work takes to move end-to-end, which is meaningful for unpredictable creative work
- The GDD anti-pattern is identifiable by one symptom: sprint planning reads from a document rather than from prioritised, decomposed backlog items with clear owners

## Context

Primary source: Production Alchemist newsletter, "Production 101 #12: Agile for Game Producers" by Rob Sandberg. Sandberg is a game producer with published experience across game studios; the newsletter covers production practice for the game industry. The article draws from Clinton Keith's "Agile Game Development with Scrum" as secondary reference. No specific studio names, team sizes, or outcome metrics are cited in this article. No publication date confirmed from the fetch; newsletter is active as of 2026.

## Applicability

Most directly applicable when a client studio is experiencing sprint planning dysfunction: velocity that doesn't correlate to shipped features, or feel-pass work repeatedly rolling over sprint boundaries. The dual-track recommendation is actionable as a structural change: identify which work is specification-able (use sprints) and which is iteration-and-feel (use Kanban with WIP limits). The GDD anti-pattern diagnostic is usable as a single question in a production audit: "Where does your sprint backlog come from?" If the answer is "from the design document" rather than "from a prioritised, decomposed backlog," the team is running waterfall in sprint clothing.
