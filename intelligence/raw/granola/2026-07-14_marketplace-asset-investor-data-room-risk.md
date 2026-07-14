---
source: granola
source_id: d40e4df7-3d40-4d03-ac56-343e91a04dad
source_path: https://notes.granola.ai/d/d40e4df7-3d40-4d03-ac56-343e91a04dad
ingested: 2026-07-14
topics_detected: [investor-relations, data-room, marketplace-assets, ip-risk, series-b, due-diligence]
relevance_score: 9
novelty_score: 9
actionability_score: 9
bank_candidates: [production_methods, games_pitch_decks]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: insight
---

# Marketplace Asset Licence Risk in Investor Due Diligence

## Key Content

A studio preparing for a $10M+ funding round discovered that third-party Marketplace assets used in their game carry licences that surface as a flagged item during data room due diligence. Investors at Series B scale and above conduct licence audits as part of IP clean-room review; Marketplace asset terms (Epic, Unity Asset Store, etc.) restrict commercial redistribution in ways that can become diligence blockers.

The risk compounds in two ways:
1. Assets assumed to be throwaway placeholders had been in the build long enough to become de facto permanent -- the team had stopped treating them as temporary
2. An investor-commissioned licence audit at $10M+ will surface every third-party asset file and its associated licence; anything with a non-standard or restrictive commercial licence becomes a negotiation point

Mitigation: reclassify all Marketplace content as placeholder immediately. Compile an asset registry mapping each Marketplace asset to its licence terms and replacement timeline before VDR preparation begins. Replace assets with custom-built equivalents before the data room opens.

## Decisions / Insights

- Studio CPO identified: Marketplace asset licences are a data room exposure at Series B scale; the assumption that placeholder assets are invisible to investors is wrong.
- Studio CPO decided: all Marketplace content must be explicitly flagged as placeholder and tracked for replacement before fundraise preparation begins.
- Studio leadership concluded: an asset that is present in a build for longer than one sprint without a tracked replacement plan should be treated as a permanent component for IP audit purposes.

## Context

Executive meeting at a ~55-person MMO studio preparing for a $10M+ raise, 14 Jul 2026. The issue surfaced during a downtime environment pipeline discussion when it emerged that no custom art kit had ever been built -- all assets were Marketplace purchases. The investor data room risk was flagged as a direct consequence.

## Applicability

Relevant when: advising a studio preparing for Series A or B on data room readiness -- a Marketplace asset audit is a required step before VDR preparation begins.
Relevant when: a game build has relied on Marketplace assets beyond the early prototyping phase -- each asset must be mapped to its licence terms and flagged as placeholder with a replacement timeline.
Relevant when: an investor-backed game studio is using Epic Marketplace or Unity Asset Store content -- assume a licence audit will occur at any round above seed; prepare accordingly.
Relevant when: a studio is compiling investor materials for a $10M+ round -- IP clean-room requirements at this scale include software licence chains, not just code attribution.
