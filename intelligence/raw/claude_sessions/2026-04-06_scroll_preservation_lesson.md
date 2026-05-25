---
source: claude
source_id: handoff_2026-04-06c_glen_uat
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-06c_glen_uat.md
ingested: 2026-05-25
topics_detected: [ux-engineering, scroll-preservation, live-uat, ocr-pipeline]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Scroll Preservation: 5 Iterations to Get Right

## Key Content

Glen tested the dashboard live on desktop and phone, reporting scroll reset on every field update. Five iterations were needed to fix it: (1) save/restore scrollTop on renderAll -- failed because standup renders async, (2) deferred restore via global flag -- failed due to wrong currentView check, (3) fixed condition -- worked but showed page flash, (4) targeted DOM updates bypassing renderAll -- no flash for standup edits, (5) sync poll cooldown suppressing re-renders of own changes. The root cause was the 10-second poll detecting its own changes bouncing from server and triggering renderAll.

Also established: OCR.space for receipt scanning (free tier, 500 req/day), currency detection by text only (OCR misreads pound/dollar signs), and auto-compact permanently disabled (D58).

## Decisions / Insights

- Scroll preservation requires three mechanisms: targeted DOM updates, deferred restore for full re-renders, and sync poll cooldown
- The real enemy of scroll position is the sync poll, not the user's own edits
- OCR currency detection must use explicit text ("USD", "GBP") not symbols -- OCR misreads them
- Glen tests on both desktop and phone simultaneously -- mobile must work
- D51: "Page must NOT reset scroll position when updating fields" -- tested 5 times before right
- D58: Auto-compact permanently disabled -- manual handoff only

## Context

First real UAT session with Glen actively using the dashboard. Every issue was reported in real time via screenshots and voice messages.

## Applicability

- Any SPA with polling must suppress re-renders of the user's own changes (cooldown pattern)
- Inline editing must use targeted DOM updates, never full page re-render
- Receipt/document OCR should never rely on currency symbols -- always use text detection
- When Glen tests, he tests thoroughly -- prepare for 5+ iterations on UX issues
