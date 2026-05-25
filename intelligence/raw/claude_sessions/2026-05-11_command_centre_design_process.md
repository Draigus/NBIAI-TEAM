---
source: claude
source_id: handoff_2026-05-11_command_centre
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-05-11_command_centre.md
ingested: 2026-05-25
topics_detected: [command-centre, visual-design-process, ai-os-research, mockup-iteration]
relevance_score: 8
novelty_score: 8
actionability_score: 7
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Command Centre Design: 7 Mockup Iterations

## Key Content

Research phase analysed 4 AI OS approaches (Jack Roberts visual dashboard, Nate Herk Four Cs framework, Simon Scrapes skill chaining, Ralph Wiggum autonomous loop). Gap analysis identified 15 items across 3 tiers. Design went through 7 mockup iterations: v1 2-col rejected ("looks like shit on widescreen"), v2 3-col rejected ("underwhelming value"), v3 "better but not exciting", v4 approved for Dashboard tab (animated rings, gradient accents, glassmorphic cards, staggered entrance), briefing v1 rejected ("colours too dark, text too small"), v2 needed interactivity, v3b approved for Briefing tab. Key decisions: incremental phasing (Phase 1 dashboard+scanners, Phase 2 nightly cron, Phase 3 autonomous execution), intelligence over inventory ("cards show actionable insights, not file counts"), daily briefing as interactive cards not plain text.

## Decisions / Insights

- D7: Intelligence over inventory -- show actionable insights, not file counts
- D9: Briefing must be interactive cards and lists, not plain text
- D10: Interactivity extends to ALL views -- hover actions, expandable cards, filter chips
- Glen requires 7+ mockup iterations for visual design approval -- expect rejection and iterate
- "Looks like shit on widescreen" = must design for large monitors first, not laptop
- Gradient colour bars must be thick (3px with glow), not subtle
- The aesthetic must feel "exciting, not just functional"
- Phase 3 autonomy: code only, worktree only, Glen merges

## Context

The Command Centre is NBI's AI OS dashboard -- a meta-view showing the health of the entire AI infrastructure.

## Applicability

- Visual design requires multiple iteration rounds with Glen -- plan for 5-7 mockups
- Design for widescreen first, then responsive down
- Static/text-heavy views will be rejected -- everything must be interactive
- Autonomy scope: AI can write code in worktrees but Glen controls what gets merged
