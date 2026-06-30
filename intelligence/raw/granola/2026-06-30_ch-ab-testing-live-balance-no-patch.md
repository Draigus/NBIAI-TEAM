---
source: granola
source_id: 99d69fb5-dbc1-463a-ac7a-02c2df09ca87
source_path: https://notes.granola.ai/d/99d69fb5-dbc1-463a-ac7a-02c2df09ca87
ingested: 2026-06-30
topics_detected: [live-service, game-balance, ab-testing, tooling, production, no-patch-update]
relevance_score: 8
novelty_score: 9
actionability_score: 7
bank_candidates: [production_methods, client_couch_heroes]
new_bank_suggestions: []
sensitivity_class: client_scoped
extract_type: methodology
---

# A/B Testing for Live Game Balance via Web UI Without Releasing a Patch

## Key Content

A live-service MMO studio is building a dedicated A/B testing system that allows game designers to adjust balance variables via a web page -- without cutting a new game patch.

**Architecture intent:**
- Game designers log into a web interface to modify balance parameters (values, tuning knobs, numeric variables)
- Changes deploy server-side; client receives updated values without a client patch release
- The system enables true A/B split testing: different player segments receive different tuning values simultaneously
- This decouples balance work from the patch release cycle entirely

**Why it matters:**
- Live-service games traditionally require patches to change balance parameters, creating long feedback loops
- This system compresses tune-observe-iterate from weeks (patch cycle) to days or hours
- Designers act without engineering dependency once the system is built
- Reduces patch frequency and associated QA overhead for balance changes specifically

**Current status (Jun 2026):** system in development at the studio; backend infrastructure being built.

## Decisions / Insights

- Studio leadership decided: invest in a web-based balance tuning layer separate from the patch pipeline, treating balance as a live data system not a release deliverable.
- Studio leadership concluded: decoupling balance tuning from patch cycles gives designers ownership of their work output without requiring engineering releases.
- Studio leadership observed: the investment in tooling infrastructure during pre-production pays dividends throughout live service by removing designer/engineer hand-offs for routine balance work.

## Context

Executive meeting at a ~65-person live-service MMO studio in early production (vertical slice phase), Jun 30 2026. Attendees: CEO, COO, Art Director, Head of Tech, Head of Production, Head of HR, EP, studio advisor (Glen). Studio is building internal tooling alongside the vertical slice.

## Applicability

- Relevant when: advising a live-service studio on tooling investment priorities during pre-production -- a balance tuning system is high-leverage and compounds throughout live.
- Relevant when: a studio's balance work is blocked by patch release cycles -- decoupling balance from patches is the architectural fix.
- Relevant when: assessing a studio's operational maturity for investor due diligence -- live-without-patching balance capability signals sophisticated live-service thinking.
- Relevant when: a studio is planning live ops structure and wants to give designers direct agency over balance without engineering dependency.
