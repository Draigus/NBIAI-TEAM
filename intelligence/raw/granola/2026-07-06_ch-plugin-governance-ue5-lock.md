---
source: granola
source_id: 61c67eb9-c9cb-4113-a638-c72e9dc05d85
source_path: https://notes.granola.ai/d/61c67eb9-c9cb-4113-a638-c72e9dc05d85
ingested: 2026-07-06
topics_detected: [plugin-governance, unreal-engine, ue5, ue6-risk, tech-debt, production-policy]
relevance_score: 7
novelty_score: 9
actionability_score: 8
bank_candidates: [production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Plugin Governance Policy for Live-Service Unreal Engine 5 Games

## Key Content

A plugin governance framework established at a studio building a multiplayer online game on UE5:

**Approval gate:**
- No large systemic plugins enter the game without explicit senior advisor (CPO) approval
- Engineering redirects all plugin requests with a named response: "CPO needs to approve that"
- Marketplace assets (small, scoped) are acceptable; large systemic plugins (combat frameworks, traversal systems, etc.) are not

**UE5/UE6 lock rationale:**
- Studio locked to UE5 (targeting 5.8/5.9 range); not migrating to UE6 mid-production
- UE6 eliminates Blueprints and C++, pushing Verse language -- not viable for any studio with an existing codebase mid-production
- Plugin developers will stop maintaining UE5-compatible versions once UE6 ships; systemic plugins face end-of-life risk
- Every major Unreal update breaks complex plugins; fragility is structural, not incidental

**Manifest requirement:**
- Full manifest of all existing plugins required: red (breaks on next UE update) / yellow (risk to monitor) / green (low fragility)
- Red and yellow items feed a backlog of custom code replacements over time
- Tech debt plan: schedule plugin replacements with custom code; do not allow systemic plugin count to grow

**Root cause identification:**
- Plugin pressure originating from a specific team member routing requests through other leads
- Framing: process failure, not a people failure -- the approval gate addresses the structural issue; the people conversation is separate

## Decisions / Insights

- Glen decided: all large systemic plugin requests require explicit CPO approval; named gating replaces general policy statements.
- Glen decided: studio stays on UE5 (5.8/5.9 target); UE6 is not viable mid-production due to elimination of Blueprints and C++.
- Glen identified: plugin end-of-life risk is real -- once UE6 ships, UE5 plugin updates stop; complex systemic plugins have structural fragility compounded by version risk.
- Glen decided: full plugin manifest with R/Y/G update-breakage rating required before any further integration decisions.

## Context

Combat Abilities System Decision Call at a ~55-person MMO studio, 6 Jul 2026. A specific combat plugin (ACF) had been evaluated 4-5+ times with no recorded decision. A plugin governance policy was established to address the systemic issue rather than resolve each request individually.

## Applicability

- Relevant when: a studio is building a complex multiplayer game on UE5 -- systemic third-party plugins (combat, traversal, progression) are fragile and face version-lock risk as UE6 ships.
- Relevant when: engineering is receiving repeated plugin requests from the same informal source -- named gating (senior approval required) redirects pressure structurally rather than requiring repeated individual rejections.
- Relevant when: advising on tech architecture for a mid-production studio -- a plugin manifest with update-breakage risk rating (R/Y/G) is the minimum viable audit before lock-in decisions.
- Relevant when: a studio is debating a UE5 to UE6 migration -- UE6's elimination of Blueprints and C++ makes it unsuitable for any studio with an existing production codebase; the migration cost is a full rewrite, not an upgrade.
