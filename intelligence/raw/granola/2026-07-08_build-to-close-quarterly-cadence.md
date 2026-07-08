---
source: granola
source_id: 2f0c341b-0d0c-4614-b618-3bce6746349c
source_path: https://notes.granola.ai/d/2f0c341b-0d0c-4614-b618-3bce6746349c
ingested: 2026-07-08
topics_detected: [delivery-cadence, build-rhythm, vertical-slice, feature-closure, production-discipline]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Build-to-Close: Quarterly Delivery Cadence for Studios Without Release Discipline

## Key Content

A ~55-person studio with no history of regular delivery adopted a "build-to-close" cadence as a core production discipline, targeting a stable releasable build every three months.

**Core principle -- build to close, not build to progress:**
- Quarterly releases must represent feature CLOSURES (things formally closed on the roadmap), not just progress updates
- Goal: build "build to close" into the team's muscle memory: "build to close, build to close, build to close -- instead of whatever they were doing before"

**How daily builds support quarterly releases:**
- Daily builds + continuous smoke testing = quarterly releases are predictable and boring
- "By the time we get there, we should already know every single nook and cranny"
- The quarterly release should surprise no one; all issues should have been caught in daily builds
- "Some of the horrors that come out at three months -- we'll have already caught them"

**Tracking layer needed:**
- External tracking alongside Jira showing where features are in terms of being closed, not just in progress
- Critical distinction: "in progress" and "closed" are different states; the tracking layer must make closed features visible separately from in-progress features

**Why quarterly:**
- Not tied to milestone or investor schedule -- chosen for rhythm-building alone
- Prevents accumulation of issues that surface only at major release points
- Creates a repeatable "feature closure" event that all teams can orient around

## Decisions / Insights

- Studio leadership decided: three-month stable releasable build as the foundational delivery cadence, chosen for discipline-building rather than external milestone alignment.
- EP observed: daily builds make quarterly releases boring, not stressful -- the surprises get caught early.
- Studio leadership decided: quarterly releases represent formal feature closures on the roadmap, not progress reports.
- Studio leadership decided: build a tracking layer (Jira + external tooling) to show closed-out features separately from in-progress features.

## Context

Planning session between CPO and EP at a ~55-person MMO studio, 8 Jul 2026. The studio had been running an open-ended build without delivery rhythm; vertical slice is the mechanism for establishing the new cadence. The EP had framed the goal to the CEO as: "I don't care what we call it. I want the team used to releasing something stable every three months."

## Applicability

- Relevant when: a studio has no history of regular releases and is attempting to build delivery discipline -- quarterly feature-closure cadence is the entry point.
- Relevant when: advising a studio whose milestone reviews are stressful because issues surface late -- daily builds + smoke testing are the structural fix; quarterly releases become boring.
- Relevant when: a studio's progress tracking conflates "in progress" with "closed" -- tracking layer must surface feature closures explicitly.
- Relevant when: a studio is setting up Jira and needs to know what to track -- closed features on the roadmap (not just sprint progress) is the key metric.
- Relevant when: a studio team has never shipped and needs a mental model for what "done" means -- "build to close" as a repeatable phrase encodes the delivery contract.
