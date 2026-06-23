---
source: granola
source_id: 7723024a-acfd-4e20-bc72-a83446984630
source_path: https://notes.granola.ai/d/7723024a-acfd-4e20-bc72-a83446984630
ingested: 2026-06-23
topics_detected: [tencent, publishing, data, telemetry, live-service, legal]
relevance_score: 8
novelty_score: 9
actionability_score: 7
bank_candidates: [client_couch_heroes, industry_current]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: insight
---

# Tencent Publishing: Data Sovereignty and Telemetry Terms

## Key Content

Tencent's standard publishing terms include sole data controller status: all telemetry routes through GCP infrastructure owned by Tencent, with PII stripped before delivery to the studio.

**Stated rationale:** regional compliance (mainland China equivalent of GDPR).

**What the studio receives:** raw telemetry with PII removed. No demographic enrichment by default.

**What to negotiate:** push for enriched data beyond raw telemetry -- specifically demographic fields (age range, country of origin) that are passing through Tencent's system anyway. Tencent has structural incentive to retain this data; they will push back but the ask is reasonable given the routing.

**Login gate:** Level Infinite (Tencent's publishing arm) login required for all players as part of the publishing agreement. This affects player acquisition funnelling and identity data.

**Commercial risk:** Tencent is on a US military watchlist. If the game achieves significant US market penetration, a TikTok-style forced operational split is a plausible outcome. Plan for this.

**Implication for live service design:** if demographic data won't be available at launch, build analytics and player segmentation strategies around what CAN be obtained. Do not design live service monetisation that depends on demographic targeting Tencent controls.

## Decisions / Insights

- Glen decided: push Tencent for demographic enrichment (age range, country) routed through their GCP pipeline
- Pattern observed: Tencent retains data control to serve their own analytics interests, not just compliance
- Risk flagged: US ban scenario mirrors TikTok; most likely manifests as split operations if game achieves US scale
- Glen concluded: studio should not assume full data access; design telemetry strategy around restricted delivery

## Context

Production meeting at CH (Couch Heroes), June 2026. CH has a publishing agreement with Tencent (Level Infinite). Data terms discussed during a review of telemetry infrastructure and investor strategy planning.

## Applicability

Relevant when: advising a studio negotiating or reviewing Tencent publishing terms -- use this to set data access expectations early.
Relevant when: designing analytics infrastructure for a Tencent-published title -- assume restricted demographic data from day one.
Relevant when: assessing commercial risk of a Tencent-backed investment or studio -- flag US regulatory exposure as a scenario.
Relevant when: a studio is building live service monetisation and needs to know what player data will be available post-launch.
