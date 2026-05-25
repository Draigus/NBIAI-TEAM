---
source: claude
source_id: handoff_2026-04-14a_full_backlog_clearance
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-14a_full_backlog_clearance.md
ingested: 2026-05-25
topics_detected: [sow-extraction, pricing-filtering, backlog-clearance, feature-velocity]
relevance_score: 7
novelty_score: 8
actionability_score: 7
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# SoW Extraction: Pricing and Legal Filtering Pattern

## Key Content

Built a defensive PDF text extractor for Statements of Work that filters out pricing and legal content before storing extracted text. Pricing keywords trigger skip: fee/rate/cost/payment/currency symbols/VAT/banking. Legal keywords trigger skip: confidentiality/IP/liability/indemnification/warranty/termination/dispute/GDPR. Section headers trigger skip mode for entire sections. Original PDF never written to disk (memory-only multer, buffer nulled after extraction). Kept only scope and deliverables content. Verified end-to-end with a synthetic PDF containing GBP 42,500 + VAT + Confidentiality -- all stripped, only Scope/Deliverables retained. The same session cleared 33 bug tracker items and built 7 features (Bug Tracker kanban, SoW layer, Calendar Events, Warnings sidebar, Teams, Hiring, Practices).

## Decisions / Insights

- SoW text extraction must filter pricing and legal content before storage -- never store contract financials in task management
- Memory-only file handling (buffer nulled after use) prevents sensitive PDFs from persisting on disk
- Section-level skip mode catches multi-paragraph legal sections, not just individual keyword lines
- 33 items cleared + 7 features built in one session demonstrates the velocity possible with autonomous execution and an approved plan
- Bug Tracker items should follow the 7-step triage pipeline (Receive > Review > Plan > Prioritise > Fix > Test > Update)

## Context

This was the largest single autonomous session. The SoW extraction pattern is reusable for any document where certain content categories must be excluded.

## Applicability

- Any document ingestion dealing with contracts must filter pricing and legal content
- File handling for sensitive documents should use memory-only processing, never write to disk
- Autonomous execution with a pre-approved plan can clear large backlogs efficiently
- The pricing/legal keyword lists are a starting point -- extend as new contract patterns emerge
