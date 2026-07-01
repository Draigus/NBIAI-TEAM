---
source: granola
source_id: d21d1b9c-a66c-46b2-a3e3-2179bc726aea
source_path: https://notes.granola.ai/d/d21d1b9c-a66c-46b2-a3e3-2179bc726aea
ingested: 2026-07-01
topics_detected: [vertical-slice, estimation, commitment-protocol, crunch-policy, scope-lock]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Vertical Slice Estimation Commit Protocol: Minimum Bar, Buffer, and Crunch Accountability

## Key Content

A structured approach to locking vertical slice scope and estimates with a studio, covering minimum bar definition, estimation confidence, crunch accountability, and the post-lock change control gate.

**Minimum bar definition:**
- VS delivery definition of done: T4 proxy-kit quality (e.g. a C4 environment equivalent) -- a floor, not a ceiling
- Teams are explicitly encouraged to push toward T5, T6, or full polish where possible
- Keeping the minimum bar below aspirational target prevents paralysis and underscores that shipping something is the goal

**Estimation confidence:**
- Estimates built from six weeks of actual work completed by the team
- Accepted buffer: ±10%
- Caveats from individual leads acknowledged (e.g. UI/UX gap pending a hire) but the plan is treated as fixed regardless
- Uncaveated items: any caveat that is a production or leadership problem, not a team problem, is absorbed by leadership

**Crunch accountability model:**
- Crunch is acknowledged as a real possibility if estimates slip
- GP/EP (senior advisor and executive producer) absorb the accountability for crunch, not the teams
- A clear start and end date for any crunch period must be committed to before crunch begins -- open-ended crunch is not permitted

**Post-lock change control:**
- Once VS1 scope is locked, any addition requires a formal change request (CR)
- CRs must be approved by the senior advisor (Glen) before being actioned
- CR process to be designed and added to the production backlog before lock

## Decisions / Insights

- Glen decided: July 1 as the official VS estimation commit date; the plan is treated as fixed from this point.
- Glen decided: crunch accountability rests with Glen and the EP, not the production teams; teams commit to estimates, leadership absorbs the risk.
- Glen decided: any scope addition after VS1 lock requires a formal CR approved by Glen; no informal scope additions after this date.
- Glen observed: caveats that are a production or leadership problem (UI/UX hire gap, unresolved tooling) should not be held by individual leads -- absorbing these cleanly into leadership accountability prevents leads from using them as ongoing excuses.

## Context

All-hands estimation commit meeting at a ~65-person MMO studio, Jul 1 2026. Attended by senior advisor, EP, leads across art, engineering, and design. All teams verbally committed. The meeting concluded the six-week estimation process and established the formal scope lock point for the vertical slice.

## Applicability

- Relevant when: locking a vertical slice scope with a mid-size studio -- the minimum-bar-plus-ceiling framing prevents the estimate from being treated as a quality ceiling.
- Relevant when: building a crunch policy for a development team -- naming who absorbs accountability (leadership, not teams) before the conversation about whether crunch is needed reframes the dynamic.
- Relevant when: establishing a post-lock scope control process -- the formal CR gate with named approver prevents informal scope creep in the weeks after the commit meeting.
- Relevant when: handling caveated estimates from individual leads -- separating "production problem" caveats from "team problem" caveats and absorbing the former at leadership level prevents ambiguity about who owns the risk.
