---
source: granola
meeting_id: 30515fe6-c5d2-42d7-bcfc-232080cfa6f3
title: "Hannah QA Catch-up — Build Management, Perforce, QA Process"
date: 2026-04-08
participants: [Glen Pryer, Hannah Pickard]
domain: [qa, production, engineering]
client: couch_heroes
relevance: 8
novelty: 7
actionability: 8
---

# Hannah QA Catch-up — Build Management, Perforce, QA Process

## Key Issues

### Build Management
- Daily manual builds when Hannah runs them. ~10% failure rate (once every 2-3 weeks).
- Nightly builds mentioned by Mustafa but no update on implementation.
- Build failures typically crash on launch due to DevOps issues.
- Planning hard lock tomorrow or early next week — will branch for bug fixes only.

### Perforce Migration Problems
- Lost critical review workflow from GitHub/DevOps transition.
- Previously Rainer approved all commits before merging — now anyone can push directly to streams.
- Can't identify problematic commits until build breaks. Interface less intuitive than DevOps.
- Reverting to working builds is currently "stab in the dark" approach.

### QA Process Gaps
- No design specs with clear success criteria. No technical design docs. No structured user stories.
- Bug assignee matrix now outdated — same bug assigned to different people daily.
- Rainer transitioned away from build ownership — Hannah uncertain who to report issues to.
- Mustafa "runs around in panic mode" tagging multiple people instead of clear ownership.

### Glen's Proposed Feature Revision Process
- Rev 1: Skeleton functionality. Rev 2: Set criteria. Rev 3: Fully functional. Rev 4: Polish.
- Each feature needs: purpose, target audience, priority, success criteria, design doc, TDD.

### Studio Growth
- Currently ~50 staff, hiring another 17. Projected growth to 120-150.
- Three producers to be implemented. New EP hired.
- Production gates required before moving from pre-production to start production.

## Action Items
- Hannah: deliver comprehensive QA requirements document within 3 weeks for offsite (tools, human pipelines, product pipelines, content pipelines, measurable criteria, QA department structure, prioritisation alignment).
- Glen: verify with Mustafa if Helix Swarm web UI available. Address build ownership crisis.

## Intelligence Value
Reveals deep QA infrastructure gaps at CH: no review workflow post-Perforce migration, no design specs, no clear build ownership. Hannah is competent but operating in a vacuum. The 3-week QA requirements document will be a critical artifact.
