---
source: granola
source_id: 9e7a43df-19fc-4989-9958-db7437f63cc6
source_path: https://notes.granola.ai/d/9e7a43df-19fc-4989-9958-db7437f63cc6
ingested: 2026-06-19
topics_detected: [build-management, qa, devops, studio-infrastructure]
relevance_score: 7
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Nightly Stable Build Protocol for Game Studios

## Key Content
Two-environment build setup for a game studio transitioning to Perforce:

**Stable environment**: nightly build runs at 4am, pulling latest changes from main. Each morning, QA lead runs a smoke test and posts to the studio channel: "this build is live and has been tested, ready to play." This creates an always-accessible, always-sanity-checked build that anyone in the studio can jump into at any time. The QA lead owns the morning check and the channel communication.

**Verification environment**: runs a build on every PR submission. Doubles as a gate -- checks that what someone is pushing does not break the build before merge. Not a testing environment; not for general access. Background infrastructure only.

The stable build is explicitly one sprint behind main. Main = merge target, not coding target. The goal is that leadership and cross-discipline staff always have a reference state of "this is where the game is today."

## Decisions / Insights
- Glen decided: nightly 4am build + morning smoke test + channel post is the minimum viable stable build protocol.
- Glen decided: stable build is always one sprint behind main; this is a deliberate lag, not a gap.
- QA lead decided: verification environment per-PR to prevent breaking changes reaching main without detection.
- Pattern recognised: without a defined stable build, biweekly showcases become the only visibility point -- creating false confidence.

## Context
1:1 with QA Lead, 2026-06-19. Studio is a ~70-person MMO on Perforce, previously had no stable build environment. The QA lead had just established these two environments with the Head of Tech. Glen was learning about the setup and providing architectural framing for how to extend it.

## Applicability
Relevant when: a studio needs a lightweight way to give all staff (not just tech) access to a current, playable build at all times.
Relevant when: advising on what the minimum viable build infrastructure looks like for a mid-size studio entering vertical slice.
Relevant when: a QA lead is defining what their morning ownership responsibilities are in a production cycle.
Relevant when: leadership is relying on biweekly showcase builds as the only visibility into game state.
