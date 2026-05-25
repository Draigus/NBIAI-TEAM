# Intelligence Brief — 2026-05-25

## What's New

- **personal_insights** bank created: 201 lines synthesised from 20 Claude session handoff extracts. Covers Glen's quality standards, strategic decisions (vanilla JS, AIOS architecture, AI ops as revenue), rejected approaches, working patterns, and client relationship philosophy.
- **production_methods** bank created: 239 lines synthesised from 23 Claude session handoff extracts. Covers audit-driven improvement, bug triage pipeline, tech debt ordering, test infrastructure patterns, migration frameworks, and the three-artifact client delivery model.
- **Intelligence pipeline bootstrapped:** Directory structure, 5 agent prompts, 7 bank schemas, 4 config files, 3 new skills (/ingest-chats, /compile-bank, /intel-brief) all created and committed.

## Today's Context

First day of intelligence pipeline operation. Most relevant banks:
- **personal_insights** — Glen's decision patterns and working preferences (loaded on request by any role)
- **production_methods** — production frameworks applicable to client advisory (loaded for producer, production_consultant roles)

## Pipeline Health

- Banks: 2 active (personal_insights, production_methods), 5 empty (awaiting sources)
- Pending: 0 extracts awaiting promotion, 0 sensitive awaiting review
- Research: not yet activated (Phase 5)
- New bank suggestion noted: `ai_capabilities` (2 extracts, threshold not met)

## Actions Needed

- **Calibration review:** Glen should review 5-10 extracts in `intelligence/raw/claude_sessions/` to confirm quality and scoring. Mark as useful/noise/borderline.
- **ChatGPT export location:** When ready for Phase 2, provide the path to the ChatGPT export on OneDrive.
