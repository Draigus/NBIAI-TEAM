---
source: claude
source_id: handoff_2026-04-11b_hierarchy_dependencies_timeline
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-11b_hierarchy_dependencies_timeline.md
ingested: 2026-05-25
topics_detected: [work-item-hierarchy, prerequisites, terminology]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Work Item Hierarchy and Prerequisites: Canonical Terminology

## Key Content

Glen locked the 4-level work item hierarchy: Project > Feature > Story > Task. Not "Tickets" -- Glen explicitly rejected that term. Sidebar renamed from "Tasks" to "Projects", "My Tasks" to "My Work". Prerequisites system uses hard-block on Done status (cannot mark Done with incomplete prereqs), soft-warn on In Progress (warning with override). Circular dependency prevention via BFS walk. Terminology is "Prerequisites" not "Dependencies" or "Blocked By". Delete cascade shows descendant type counts in confirmation. Timeline zoom uses +/- buttons not preset levels. Today marker is green column not red line. Dependency linking via drag arrow on Gantt.

## Decisions / Insights

- D68: Fixed 4-level hierarchy: Project > Feature > Story > Task -- no 5th level without re-reading README
- D69: Sidebar terminology: "Projects" and "My Work" (not "Tasks"/"My Tasks")
- D70: Delete cascade requires strong warning showing exactly what will be deleted
- D71: "Prerequisites" is the canonical term (not Dependencies, not Blocked By)
- D72: Hard-block Done + soft-warn In Progress for prerequisite enforcement
- D73: Timeline zoom is continuous (+/-) not discrete (Week/Month/Day)
- D76: Critical path as filtered Gantt, not separate view
- D77: Today marker = green column (not red line)
- item_type is enforced server-side on create, drag-drop, and reparent

## Context

This hierarchy is enforced at database, server, and frontend levels. Any change to it requires coordinated updates across all three.

## Applicability

- Never add a 5th hierarchy level without explicit approval and README review
- Use "Prerequisites" terminology everywhere, never "Dependencies" or "Blockers"
- Cascade deletes must always show the user exactly what will be removed
- The hierarchy validation pattern (VALID_CHILD_TYPE, VALID_PARENT_TYPE maps) is reusable
