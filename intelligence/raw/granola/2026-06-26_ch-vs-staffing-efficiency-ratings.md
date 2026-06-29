---
source: granola
source_id: 5b371bd1-5927-45ec-a7a7-9be59caf8ba3
source_path: https://notes.granola.ai/d/5b371bd1-5927-45ec-a7a7-9be59caf8ba3
ingested: 2026-06-26
topics_detected: [staffing-model, vertical-slice, estimation, lead-capability, efficiency-ratings, scope]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Vertical Slice Staffing Model: Efficiency Ratings and Estimation Calibration

## Key Content

A ~65-person studio built a staffing model for a vertical slice milestone. The model was built by the Head of Production (underlying data) and an Executive Producer (pivot table structure). Leads assigned efficiency ratings per person.

**Model structure:**
- Hours per role divided by 20 (working days/month) then by effective headcount in that role = months required or additional hires needed
- Efficiency ratings assigned by leads per person (0-100%)
- Role coverage gaps surfaced: system designer was uncovered, split between two people at 50% each; animation and UI/UX also flagged red
- Role naming confusion (e.g. "World Builders") caused consistent misreads -- label discipline roles by industry-standard names, not studio-specific ones

**Calibration problems identified:**
- Some leads set efficiency ratings optimistically (e.g. 90% efficiency for an animation lead who had produced 4 animations in 6 months)
- Estimates were made before a definition of done was established -- teams defaulted to estimating for full launch, not the scoped milestone
- A single zone estimate of 155 days was suspected to include 20-30% padding plus scope that could be cut; one additional hire could halve the timeline
- QA table at 260 days was flagged as structurally good but numerically unrealistic -- the lead had not modelled a contracted QA team (see QA extract)

**Lead estimation capability assessment:**
- Requested: rate each lead 1-5 on estimation ability with 2-3 sentences of observed evidence
- Purpose: identify who needs training and how far to trust incoming numbers; apply per-person fudge factors once patterns emerge in time-tracking data
- Key finding: bad estimators in a spreadsheet will be bad estimators in Jira; the tool does not fix the skill

**Jira integration design:**
- Every task over 1 hour gets time booked against it
- Estimated hours logged at task creation; actuals tracked on close; deltas calculated per person over time
- Fudge factors applied per person once a reliable personal delta pattern emerges

**Scope framing rule:** present to leadership as "how much of the vertical slice can we close this month?" not a fixed end date. Fixed dates are not shared with the team -- individual leads inflate to fill the deadline.

## Decisions / Insights

- Studio advisor decided: conduct a formal lead estimation capability assessment (1-5 scale with notes) before relying on the incoming numbers for scope planning.
- Studio advisor concluded: estimates made without a definition of done are estimates to full launch by default -- always establish the DoD before soliciting hours.
- Executive Producer observed: team leads who appear aligned may be protecting their people's estimates; independent verification against output history (not just stated ratings) is needed.
- Studio advisor decided: end dates are not shared with the team; the scope conversation with leadership is framed as "what can we close this month."

## Context

VS timeline planning meeting between studio advisor (Glen), Executive Producer, and Head of Production at a ~65-person live-service MMO studio. Date: 2026-06-26. Studio approaching a vertical slice milestone (target: T4 playable with proxy kit + MVP gameplay). Named individuals and specific studio anonymised.

## Applicability

- Relevant when: a studio is building a staffing model for a milestone -- efficiency ratings per person are essential to avoid headcount being counted at 100% productivity.
- Relevant when: estimates are suspected to be inflated -- check whether a definition of done existed when the estimate was made; most inflation comes from estimating to full launch quality.
- Relevant when: a studio is setting up Jira for production tracking -- design per-task time booking from day one; the delta between estimated and actual hours per person is the most reliable calibration data.
- Relevant when: a studio lead's estimates look plausible but output history suggests otherwise -- cross-check stated efficiency against production artefacts delivered in the same period.
- Relevant when: a studio is presenting a vertical slice timeline to investors or founders -- frame as "scope closeable this month" not a fixed end date; fixed dates inflate team behaviour.
