---
source: claude
source_id: handoff_2026-04-18_portfolio_dashboard_v2
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-18_portfolio_dashboard_v2.md
ingested: 2026-05-25
topics_detected: [dashboard-design, executive-view, progressive-disclosure]
relevance_score: 8
novelty_score: 8
actionability_score: 7
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: insight
---

# Portfolio Dashboard Design Philosophy

## Key Content

Research identified that WorkSage was trying to be 4 tools in one (executive dashboard, PM tool, back-office admin, ops/dev tooling). Average failing exec dashboard shows 30-40 metrics. Best practice: 3-5 actionable numbers, client-level RAG cards, exceptions only, progressive disclosure. The redesign moved from dense tactical/operational view to executive portfolio: one card per client, all projects shown, actionable drill-down on red/blocked items. Client cards collapsed show RAG health dot, stats (active/overdue/blocked/at risk), and progress bar. Expanded cards show hours summary, "Needs Attention" panel listing every blocked/at-risk/overdue task, and full project list. The old tactical dashboard (renderTacticalDashboard) was commented out but not deleted. "Report" tab removed from sidebar.

## Decisions / Insights

- Executive dashboards must show 3-5 actionable numbers, not 30-40 metrics
- Client-level RAG cards with progressive disclosure (collapse/expand) is the correct pattern
- "Needs Attention" panel = exceptions only (blocked + at risk + overdue) with drill-down to task detail
- The old tactical/standup view is preserved in code but not called -- it can be restored if needed
- Routing: Dashboard = portfolio view, old Report view redirected to dashboard

## Context

This redesign happened after Glen saw reference designs and felt the old view was "too operational." The portfolio view became the permanent landing page.

## Applicability

- Any executive-facing view should follow the progressive disclosure pattern: summary card > expand for details
- RAG (Red/Amber/Green) health dots are the universal status indicator
- Exception-based views (show only problems) are preferred over comprehensive status views
- Keep old views in commented code rather than deleting -- Glen may want them back
