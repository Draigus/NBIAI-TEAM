---
source: granola
source_id: 9e7a43df-19fc-4989-9958-db7437f63cc6
source_path: https://notes.granola.ai/d/9e7a43df-19fc-4989-9958-db7437f63cc6
ingested: 2026-06-19
topics_detected: [qa-tooling, tool-evaluation, internal-tools, studio-operations]
relevance_score: 7
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# QA Tool Evaluation Process and Internal Tool PR Model

## Key Content
**Tool evaluation methodology**: Management builds a vendor assessment list (mainstream tools with industry support, cost assessment, capability overview). QA builds a use case list (what do I actually need this tool to do, ranked). The two lists are merged, tools are demoed against the use cases, and purchase decisions are made on demonstrated fit, not marketing claims. A 7/10 use case match that saves headcount equivalent to 3 people is the decision criteria, not a perfect feature match.

QA tools shortlisted for evaluation at this studio: TestRail (test plans/management), TeamCity (CI/CD automation), modl.ai (AI-assisted QA -- on list for demo), DataDog (monitoring/dashboards), Sentry (crash reporting), Locust (network load testing), Toxiproxy/Shopify (programmable network chaos proxy), Helix (Perforce QA layer). TestRail and TeamCity identified as the cornerstones. Google Sheets explicitly rejected as a test plan tool.

**Internal tool PR model**: when QA or another department needs a custom tooling capability (e.g. automated Jira-to-Perforce change list linking), it is written up as a PR (product requirement) with a use case definition, goes into the backlog, gets prototyped by engineering or contracted externally, and is tested before deployment. Not a verbal request to a colleague. This puts internal tooling on the same accountability track as product features.

## Decisions / Insights
- Glen decided: tool manifest to be built by management, reviewed by each department head to confirm fit and flag gaps before purchase decisions.
- Glen decided: no test plans in Google Sheets; TestRail is the baseline tool for formalised test management.
- Glen decided: internal tooling needs follow the same PR + backlog process as product features.
- Pattern recognised: studios without a formal internal tool request process end up with ad hoc implementations (or no implementation) and the requester absorbed into informal dependency on one engineer.

## Context
1:1 with QA Lead, 2026-06-19. QA lead at a ~70-person MMO studio, previously worked with limited tooling budget; now has access to invest properly. Studio on Perforce, transitioning to Jira. Tool manifest being built by Glen to cover all departments (art, engineering, QA, audio).

## Applicability
Relevant when: advising a studio QA team on which tools to evaluate for an MMO or large-scale multiplayer title.
Relevant when: a studio needs a process for evaluating tools that prevents both over-purchasing and under-tooling.
Relevant when: a QA lead or department head needs a mechanism to request internal tooling without creating ad hoc engineering dependencies.
Relevant when: building a studio tooling budget and needing a structured approach to prioritise spend.
