---
source: claude
source_id: handoff_2026-04-07b_expenses_finance_qa
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-07b_expenses_finance_qa.md
ingested: 2026-05-25
topics_detected: [finance-architecture, expense-workflow, consulting-pnl]
relevance_score: 7
novelty_score: 7
actionability_score: 6
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# NBI Finance Architecture: Consulting P&L Structure

## Key Content

The Finance view was restructured to reflect a proper consulting P&L: Revenue (Fee Income by client) minus Billable Staff (Cost of Revenue with 15% employer costs) equals Gross Profit, minus Non-billable Staff (Support/Overhead) and Operating Expenses equals Net Profit. Monthly view has 132+ editable cells with actuals vs forecast differentiation. Expense workflow: non-dismissable monthly reminder on 25th, full-screen report view with category grouping, ZIP export with receipts, Tom as expense approver with approve/reject flow. All 68 expenses verified against bank records with date correction from placeholder 15th to actual transaction dates.

## Decisions / Insights

- D65: Expense dates must match actual bank transaction dates, never placeholder
- D66: USD expenses from GDC are actually GBP (bank already converted) -- source of truth is the bank
- Employer costs calculated as percentage (15% default, editable) applied to billable staff
- P&L structure: Fee Income > Cost of Services (billable) > Gross Profit > Support Staff > OpEx > Net Profit
- Monthly view distinguishes past (actuals, green) from future (forecast, dimmed)
- Non-dismissable notifications pattern: `dismissable=false` on notifications table, skipped by "mark all read"

## Context

This established NBI's financial reporting structure in WorkSage. The P&L terminology and structure are canonical.

## Applicability

- Any financial reporting for NBI or clients must use consulting P&L terminology (Fee Income, not Revenue)
- Expense workflows need approval chains with mandatory notes for rejections
- Bank statements are the source of truth for expense amounts and dates
