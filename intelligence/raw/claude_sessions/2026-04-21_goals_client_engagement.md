---
source: claude
source_id: handoff_2026-04-21_goals_deliverables
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-21_goals_deliverables.md
ingested: 2026-05-25
topics_detected: [client-delivery, goals-studio, pricing-engagement, deliverable-format]
relevance_score: 7
novelty_score: 7
actionability_score: 7
bank_candidates: [client_patterns, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Client Deliverable Pattern: Excel + Word + WorkSage Sync

## Key Content

Goals Studio pricing engagement (100K SEK / ~$10K USD / ~116h, deadline 27 April 2026) delivered via three-artifact pattern: (1) Excel tracker with 6 sheets (Overview, Task Tracker, Timeline, Risk Register, Deliverable Structure, WorkSage Import), (2) Word document task guide with all 21 tasks including What/How/Done When for each, and (3) live WorkSage sync via Python fix script correcting dates, hours, assignees, and success factors across all 43 items. Quality fixes applied across all three outputs simultaneously to maintain consistency.

## Decisions / Insights

- Three-artifact delivery pattern: Excel (planning), Word (execution guide), WorkSage (live tracking)
- WorkSage Import sheet in Excel enables bulk import of project hierarchies
- Deadline verification matters: 27 April confirmed via working backwards from 14 May launch (9-18 day platform review)
- Success factors must use clean language without person names or jargon
- Task assignees cleared from planning documents -- assigned by team lead at execution time
- Columns widened to prevent excessive word wrap (description=120, success_factor=90, title=55)

## Context

This is a template for how NBI delivers client engagement plans. The three-artifact pattern ensures planning, execution guidance, and live tracking are all aligned.

## Applicability

- New client engagements should use the three-artifact pattern (Excel + Word + WorkSage)
- WorkSage Import sheet format enables bulk project creation from Excel
- Always verify deadlines by working backwards from launch dates
- Deliverables should not contain NBI team member names -- use role descriptions
