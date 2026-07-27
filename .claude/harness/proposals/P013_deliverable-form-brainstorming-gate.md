---
proposal_id: P013
title: "Deliverable form brainstorming gate"
risk: LOW
target: "memory/feedback_deliverable_form_gate.md"
operation: create_new
constraint: frontmatter_schema_required
date: "2026-07-27"
status: auto_apply_candidate
evidence_events:
  - "evt_01KY7KK8KJQS8PWR79A5"
  - "evt_01KY7WRV3KJTQ2ZWRRGN"
  - "evt_01KY9X59H1FHHS5DE04Z"
  - "evt_01KYA1SHSB42CZ1B7J2X"
evidence_count: 4
confidence: 92
pattern: "PATTERN_K_deliverable_form_mismatch"
supporting_sessions:
  - "ses_01KY6FZZB66S770DY7QE (2026-07-23)"
  - "ses_01KY7WRV3PYDSQW9E8MB (2026-07-23)"
  - "ses_01KY968VFXJV592CHFCT (2026-07-24)"
---

## Problem

Between 2026-07-23 and 2026-07-24, a CH org chart deliverable was rejected THREE times:
1. HTML card-grid layout instead of boxes-and-lines hierarchy; wrong format (should be PPT)
2. 7-slide fragmented deck instead of one continuous hierarchy
3. Multiple factual errors from stale intelligence bank data; editorial narrative in boxes

Separately, a fractional CTO deck was rejected because brand colours were invented from an unrelated screenshot instead of the client's actual website and prior decks.

The brainstorming skill was mandatory for this work ("new feature, new component, creative work") but was invoked **zero times** across the entire analysis period, despite substantial creative deliverable output.

## Root Cause

The brainstorming skill was not invoked before creative deliverable work. Had it been invoked, the format question (HTML vs PPT), the visual form (card grid vs boxes-and-lines), the brand source, and the data freshness would have been surfaced before implementation, preventing 4 of the 11 interventions this period.

The mandatory skill table entry ("New feature, new component, creative work") is broad enough to cover this, but the model did not recognise client deliverables as "creative work."

## Proposed Fix

Create a feedback memory (`memory/feedback_deliverable_form_gate.md`) that makes the deliverable-specific brainstorming requirements explicit:

1. **Any client-facing deliverable with a canonical visual form** (org chart, Gantt, flowchart, timeline, deck, infographic) MUST invoke brainstorming before implementation
2. Brainstorming for deliverables must confirm: (a) output format (HTML/PPT/PDF), (b) visual form (connected hierarchy, timeline, etc.), (c) brand source (client website, prior decks, not inferred), (d) data sources and their freshness status
3. When a reference artefact exists (e.g. Glen's Miro board), match its layout principle (single canvas = single page)
4. Org chart boxes contain role + person ONLY, zero editorial

## Apply-Gate Validation

- [x] Target is LOW risk: PASS (feedback memory, create_new)
- [x] Operation is additive only: PASS (new memory file, no existing file modified)
- [x] Confidence >= 70%: PASS (92%, 4 supporting events)
- [x] frontmatter_schema_required: PASS (will include harness_rho source tag)

## Classification

LOW risk. Auto-apply candidate. Creates a new feedback memory; does not modify any existing governed target.
