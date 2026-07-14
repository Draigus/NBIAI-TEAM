---
source: granola
source_id: 4cce34f2-1e92-46f0-b5c5-d9e318e57224
source_path: https://notes.granola.ai/d/4cce34f2-1e92-46f0-b5c5-d9e318e57224
ingested: 2026-07-14
topics_detected: [plugin-governance, vertical-slice, investor-relations, data-room, production-gates, placeholder-management]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, games_pitch_decks]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: decision
---

# Third-Party Plugin VS1 Exception Gate: Investor Placeholder Documentation Requirements

## Key Content

At a studio with an established no-systemic-plugin policy, a vertical slice exception protocol was defined for cases where a third-party plugin is the only viable path to hitting VS1 production velocity and quality:

**VS1 exception criteria:**
- The plugin must be the ONLY way to hit production velocity and quality; alternatives must be exhausted first
- Decision escalates to EP, CPO, Game Director, and CEO -- not a unilateral engineering or design call
- Quality threshold = external player experience (not code quality, which will be replaced anyway)
- Intent to kill and replace with original code before launch is a required part of the approval decision

**Investor documentation requirements (non-negotiable):**
- At $10M+ investment level, data room licence audits include all third-party components in a shipped build
- All plugin-sourced content must be formally flagged as placeholder immediately on integration
- EP owns the production gate: tracks all plugin-sourced content for replacement; no plugin content reaches launch without a tracked replacement plan
- Placeholder status must be formally documented in VDR preparation materials

**General plugin philosophy established:**
- Plugins are valid as ideation tools: designers install in personal or blank projects, play, screenshot, share ideas; no shared environment needed
- Plugins are not valid as shipped components: dependency, update, and licence risks are too high
- Moving to UE6 would break C++ architecture; not planned before launch, making plugin end-of-life risk on UE5 a structural concern

## Decisions / Insights

- Studio CPO and leadership decided: VS1 plugin exception requires C-suite escalation; it is not a team-level call.
- Studio CPO decided: all plugin-sourced content in VS1 must be formally flagged as placeholder and tracked by EP for replacement before launch.
- Studio CPO identified: investor licence audits at $10M+ scale will surface every third-party component; placeholder documentation is investor-facing, not just internal.
- Studio leadership clarified: plugins as ideation tools (installed in blank personal projects, screenshots shared) is acceptable and encouraged; plugins as shipped game components is not.

## Context

ACF (Ability Component Framework) evaluation meeting at a ~55-person MMO studio, 14 Jul 2026. The studio had previously established a no-systemic-plugin governance policy. The VS1 exception protocol was defined to handle cases where a plugin is the fastest path to a required vertical slice feature. The meeting also resolved the broader ACF question: not to integrate, but to extract design ideas and patterns.

## Applicability

Relevant when: a studio needs a third-party plugin for a vertical slice demo -- the VS1 exception protocol (C-suite escalation, placeholder documentation, tracked replacement) is the minimum viable governance structure.
Relevant when: a studio is preparing investor materials at Series A or above -- any third-party component present in the demo build (even as placeholder) must be disclosed in the VDR with its replacement timeline.
Relevant when: advising a studio on plugin evaluation -- the ideation-only model (personal projects, screenshots) is the default; integration into the game requires a formal exception process.
Relevant when: a studio is using a vertical slice to demonstrate production capability to investors -- placeholder tech in the demo is acceptable, but undisclosed placeholder creates due diligence exposure.
