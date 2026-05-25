---
source: claude
source_id: handoff_2026-05-12_command_centre_build
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-05-12_command_centre_build.md
ingested: 2026-05-25
topics_detected: [build-antipatterns, visual-verification, context-rot]
relevance_score: 9
novelty_score: 9
actionability_score: 10
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: insight
---

# Build Session Post-Mortem: 6 Antipatterns

## Key Content

Brutally honest post-mortem of a failed build session. Six antipatterns identified: (1) No visual verification -- repeatedly claimed "fixed" without testing, Glen had to screenshot every issue. (2) Context rot -- by the time frontend render functions were reached, basic errors appeared: wrong DB column names, wrong status fields, wrong calendar mailbox. (3) Shotgun debugging -- tried 6 CSS approaches for scroll fix, each blind, each breaking something else. (4) API envelope not investigated -- added workaround normalisers instead of finding root cause. (5) Visual quality abandoned -- approved mockups were beautiful (glassmorphic, animated), implementation was flat boxes with text. (6) Too many small commits -- 24 commits for what should have been a focused build-then-fix cycle.

## Decisions / Insights

- Cannot claim "fixed" without visual verification -- stating upfront that visual testing is not possible and building a different workflow
- Context rot is real: by late in a session, basic schema lookups are missed. Check actual schema BEFORE writing code
- Shotgun debugging (trying random CSS changes) is always wrong -- use DevTools inspection to diagnose first
- Workaround normalisers paper over root causes and multiply maintenance burden
- Subagents given CSS classes without the full HTML structure produce flat implementations that look nothing like mockups
- Many small commits during a broken build create noise -- batch fixes into coherent commits

## Context

This post-mortem was written by the AI itself, identifying its own failures. It shaped subsequent verification discipline.

## Applicability

- Always verify against actual schema/data before writing queries -- never trust memory late in a session
- Visual verification must happen before any "fixed" claim -- use Playwright or ask Glen
- When CSS is broken, diagnose with computed styles first, then fix once -- never guess
- Subagents building frontend need the full HTML structure, not just CSS class names
