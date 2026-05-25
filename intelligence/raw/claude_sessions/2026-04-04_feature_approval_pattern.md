---
source: claude
source_id: handoff_2026-04-04_finances_and_features
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-04_finances_and_features.md
ingested: 2026-05-25
topics_detected: [product-roadmap, glen-decision-style, feature-prioritisation]
relevance_score: 7
novelty_score: 7
actionability_score: 8
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Glen's Feature Approval Pattern: Comprehensive Review Then "Build Now"

## Key Content

Glen reviewed a comprehensive feature audit and UI critique in a single session and approved ALL 15 features and ALL 13 UI changes. His responses fell into two categories: items he said "build now, not later" (file attachments, recurring templates, notifications, backup/restore, mobile responsiveness) and items where he wanted to discuss approach before building (Gantt/timeline). He also approved moving finance data from localStorage to PostgreSQL, calling it "a ticking time bomb." Key UI decisions: kill Orbitron font (use Inter/IBM Plex Sans), kill the donut chart, make dashboard KPIs show revenue not just task counts, and collapsible sidebar.

## Decisions / Insights

- Glen approves features in bulk when presented with a structured audit -- he does not want incremental proposals
- "Build now" vs "discuss approach" is Glen's binary -- he never says "park it for later"
- Data integrity issues (localStorage for financial data) trigger strong urgency
- Font choice matters enormously -- Orbitron was "sci-fi" and needed to go
- Finance data must always be in PostgreSQL, never localStorage

## Context

This session established the full WorkSage feature roadmap. 26 features were built across two sessions following this approval.

## Applicability

- Present Glen with complete audits/reviews, not piecemeal proposals -- he decides faster with full context
- When Glen says "build now", it means immediate priority, not backlog
- Any client-visible data stored in localStorage is a bug -- always use server-side persistence
