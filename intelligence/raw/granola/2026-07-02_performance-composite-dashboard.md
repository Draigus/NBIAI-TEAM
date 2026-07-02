---
source: granola
source_id: a8cca6f4-165b-4dcc-b013-7d859f0cb847
source_path: https://notes.granola.ai/d/a8cca6f4-165b-4dcc-b013-7d859f0cb847
ingested: 2026-07-02
topics_detected: [performance-management, productivity-dashboard, slack-analytics, jira, perforce, studio-ops]
relevance_score: 8
novelty_score: 9
actionability_score: 9
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Performance Composite Dashboard: Slack + Jira + Perforce Early Warning System

## Key Content

A composite productivity index for a game studio using three existing tool signals to surface underperformance before it becomes a management crisis.

**Signals used:**
1. Slack activity (presence, thread engagement, response times)
2. Jira task delivery per sprint (completed tickets vs committed)
3. Perforce check-ins (commit frequency, volume)

**Design principles:**
- Not shared company-wide -- avoids us-vs-them dynamic and gaming of the metric
- Slack alone is misleading (engineers in deep work, people running back-to-back meetings have low Slack activity)
- Composite index across all three signals gives a more reliable picture than any single signal
- Flags trigger a lead or manager 1:1 follow-up, not automatic action or HR process

**Expected impact:**
- Studio at ~55 staff getting the equivalent of ~30 people's output
- Expectation: visibility alone pushes effective output to 40-45 equivalent
- Remaining gap (after visibility effect) addressed through targeted performance process

**Integration:** built in-house; Jira integration requires coordination with project admin; Perforce asset check-ins already trackable; Slack analytics via existing workspace tooling.

## Decisions / Insights

- Glen decided: build a composite dashboard integrating Slack, Jira, and Perforce; visibility is the first lever before any direct intervention.
- Glen observed: getting 30 people's worth of work from 55 staff at a game studio is a structural problem, not an individual performance problem -- the fix starts with making the gap visible.
- Glen concluded: the dashboard must not be shared company-wide; surfacing it to leads only and using it to prompt 1:1s avoids the social dynamic that would cause the team to optimise for the metric rather than for delivery.

## Context

1:1 between senior advisor and Head of HR at a ~55-person MMO studio, Jul 2 2026. Raised as part of a broader discussion about performance visibility across a studio where Glen estimated 30/55 staff equivalent in actual output.

## Applicability

- Relevant when: a studio suspects significant underperformance but has no structured visibility -- the composite index approach is buildable from tools already in use and requires no new software purchase.
- Relevant when: Slack activity alone is being used as a productivity signal -- the composite approach corrects for the well-known failure mode where deep-work roles appear inactive on Slack.
- Relevant when: advising on a studio-wide performance uplift initiative -- positioning the dashboard as a lead tool (not a management weapon) is the critical framing decision.
- Relevant when: a studio has high headcount but low output -- the initial estimate gap (30/55 equivalent) and the expected visibility effect (to 40-45) can be used to frame the ROI of a performance visibility initiative.
