---
source: granola
source_id: 2c452a37-f0bc-440e-9bac-c30d66bb2a3e
source_path: https://notes.granola.ai/d/2c452a37-f0bc-440e-9bac-c30d66bb2a3e
ingested: 2026-06-30
topics_detected: [reporting, stakeholder-management, analytics, embedded-analyst, status-deck, milestone]
relevance_score: 8
novelty_score: 7
actionability_score: 9
bank_candidates: [client_patterns, production_methods]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Status Deck Review Framework: What/Why, Tombstone Risk, Embedded Analyst Model

## Key Content

A framework for milestone status reporting to publishers and external stakeholders, covering slide structure, risk communication, team ownership, and analyst positioning.

**What/Why framing:**
- Status slides must show the "why", not just the "what"
- For any delayed/blocked items, add inline root-cause labels: "unusable: upstream defect" / "late CL arrival" / "in progress: ETA Friday"
- A slide that lists 9 unvalidated items without context reads as incomplete; the same slide with root causes reads as managed

**Before/After Jira movement:**
- Jira ticket movement should be shown as two states side-by-side: "Status 2 Weeks Ago" and "Status Now"
- Lets stakeholders without Jira access (publishers, investors) see that tickets are actively moving
- Single-state views are unreadable to external audiences

**Tombstone risk block:**
- Risk statements buried as footnotes or caveats are ignored
- Convert to a prominent plain-English tombstone block: large text, top of slide
- Format: "[N] unfinished [items] are directly blocking [M] [at-risk deliverables]. Named items: [list]"
- Name the blocked outputs and the specific blockers -- no euphemisms

**Embedded analyst model (vs. centralised):**
- Analysts should sit within game teams, not as a detached central service
- Dashboard and KPI requirements come from embedded team members, not from a central analytics manager
- Central analytics role highest value: alpha reporting readiness, cross-publisher synthesis
- Reorder ownership by stakeholder priority: dashboards first, reporting second, dev prioritisation third, cross-publisher synthesis fourth, Jira/telemetry tracking last
- One-line mandate for the senior analytics role: "Manage deliverables to milestone through launch and live" -- tactical items attributed to named embedded staff, not the senior manager

**Audience layering:**
- Main deck: high-level for external stakeholders (publishers, investors)
- Appendix: linked Jira tickets for the internal programme manager as a proof layer
- Avoid mixing audiences in one deck

## Decisions / Insights

- Studio advisor decided: risk statements must be tombstone blocks, not footnote caveats -- external stakeholders read emphasis, not fine print.
- Studio advisor decided: Jira movement requires before/after framing; single-state snapshots are illegible to audiences without Jira access.
- Studio advisor decided: analysts should be embedded within game teams rather than operating as a central service; the central senior role shifts to synthesis and reporting.
- Studio advisor observed: tactical attribution (Jira tracking, telemetry feasibility) should be named to individual staff, not the senior analytics manager, to make the senior role look strategic not administrative.

## Context

Weekly advisory sync between studio advisor (Glen) and analytics manager at a games studio delivering to a major publisher (with a publisher-owned co-funder also reviewing reports), Jun 30 2026. The session reviewed a milestone status deck in preparation for publisher reporting. Specific studio and publisher anonymised.

## Applicability

- Relevant when: advising a studio analytics team on publisher-facing status reporting -- the tombstone risk block and what/why framing are immediately deployable.
- Relevant when: a studio has external stakeholders (publishers, co-funders) who lack Jira access -- the before/after Jira movement slide solves their visibility problem.
- Relevant when: an analytics function is perceived as a bottleneck or administrative layer -- restructuring as an embedded analyst model with a clear senior mandate fixes the perception.
- Relevant when: a milestone status deck is being reviewed and risk statements are buried -- surface them prominently before the deck goes to external audiences.
- Relevant when: a studio is setting up its analytics org structure during pre-production -- the embedded model with centralised synthesis is the right architecture for a live-service title.
