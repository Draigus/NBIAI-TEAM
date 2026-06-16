---
source: granola
source_id: not_3bUR2wWsPQvo8n
source_path: https://notes.granola.ai/d/b8d5e490-62a4-4d7e-b9a9-250decc98fa1
ingested: 2026-06-16
topics_detected: [documentation, knowledge-management, clickup, confluence, source-of-truth]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# CH Documentation SOT Decision: ClickUp First, Confluence Templated

## Key Content

Directors/Leads weekly sync, 16 June 2026. Documentation fragmentation across Confluence, Google Docs, ClickUp, and exported Word files. Decision made on source of truth.

**Decision:** ClickUp remains the interim single source of truth. Confluence access will not be opened to the full team until structure and schema are fully templated. Risk identified: opening Confluence prematurely replicates the ClickUp sprawl problem inside a new tool.

**Confluence rollout plan:**
- Graham leads templating with leads before broad access opens
- Design-led structure: every page requires an owner and approval from a director or relevant producer
- TDDs also go into Confluence; Mustafa's tech team needs a harmonised format agreed upfront
- Migration path exists: ClickUp exports to Markdown, Confluence imports Markdown; REST API bulk migration also possible with dev help

**Interim rule:** Anyone receiving docs in Word or PDF format flags to Robin or David to route into ClickUp. Art leads (David) to copy existing Confluence art docs into ClickUp now.

**GDD:** Robin's vertical slice section is the current working repo; Miro boards linked from there.

## Decisions / Insights

- [Glen] decided: ClickUp is the interim single source of truth — do not open Confluence until structure is templated
- [Glen] identified: the risk of opening Confluence early is replicating the ClickUp mess in a new tool
- [Glen/Graham] agreed: Confluence templating is design-led with mandatory owner and approval per page
- [Glen/Mustafa] agreed: TDD format needs to be harmonised before Confluence is used for tech docs
- [Glen] noted: ClickUp-to-Confluence migration is mechanically possible (Markdown export/import + REST API)

## Context

Directors and leads weekly sync, Couch Heroes, 16 June 2026. Documentation chaos is an ongoing problem. Graham recently joined (exact role not stated — appears to be a producer or ops lead). Simon (new Head of Design) and Gary (new environment art lead) added to design pipeline channels.

## Applicability

Relevant when: a studio has documentation sprawled across 3+ tools — the "pick one and hold it" approach before migrating is the correct sequence; migration before consolidation creates double maintenance.
Relevant when: advising on Confluence rollout — opening access without templating first guarantees sprawl; Graham-led structure-first is the validated approach.
Relevant when: a game director needs a working GDD during a transition period — linking Miro boards from a GDD section in ClickUp is a lightweight interim structure.
Relevant when: evaluating ClickUp-to-Confluence migration — Markdown export/import is a clean migration path; REST API bulk import exists for larger scale.
