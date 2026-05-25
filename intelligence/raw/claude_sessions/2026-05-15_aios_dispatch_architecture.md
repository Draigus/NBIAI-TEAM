---
source: claude
source_id: handoff_2026-05-15_aios_audit_phase1
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-05-15_aios_audit_phase1.md
ingested: 2026-05-25
topics_detected: [aios-architecture, role-dispatch, knowledge-consolidation, claude-md-design]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, personal_insights]
new_bank_suggestions: [ai_capabilities]
sensitivity_class: internal
extract_type: decision
---

# AIOS Architecture: Role Dispatch and Knowledge Consolidation

## Key Content

Glen requested a comprehensive audit of NBI's AI team knowledge infrastructure, concerned it was over-specified into specific tools and not getting the most out of Claude Code. Five-phase restructure designed: Clean, Dispatch System, Context Efficiency, Knowledge Consolidation, Verify/Tune. Key decisions: the AIOS is project-agnostic (serves consulting, product strategy, marketing, engineering -- not just WorkSage), all skills stay (no pruning -- the skill library IS the capability set), roles become live expertise via dispatch with composite AGENT.md files (150-250 lines each combining persona + domain knowledge + workflows). 12 composite AGENT.md files created for dispatch. CLAUDE.md restructured into Section A (Universal Rules) and Section B (Dashboard Server coding). Two routing tables: skill-triggered (brainstorming loads vp_product) and topic-detected (legal conversation loads general_counsel).

## Decisions / Insights

- AIOS is project-agnostic -- it serves ANY NBI work, not just WorkSage
- All skills stay -- the full library is NBI's capability set, not bloat
- Roles auto-trigger via skill-triggered routing AND organic topic detection
- Only CLAUDE.md and MEMORY.md auto-load -- everything else loaded on demand
- NBI_Brain.md read at session start but not auto-loaded (too large for system prompt)
- CLAUDE.md kept under 225 lines -- critical rules only, everything else in brain/ modules
- Role attribution: announce which role perspective is active so Glen can judge output accordingly
- Brain modules have last_verified frontmatter for staleness detection

## Context

This audit restructured the entire NBI AI knowledge architecture. The dispatch system and routing tables are now canonical in CLAUDE.md.

## Applicability

- When conversation enters a domain topic, load the corresponding role AGENT.md -- this is deterministic, not optional
- Brain modules should be loaded on demand via the routing table, not pre-loaded
- CLAUDE.md must stay lean (<225 lines) -- move everything else to brain/ modules
- New roles need a composite AGENT.md (150-250 lines) and routing table entries
