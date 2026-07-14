---
source: granola
source_id: 4cce34f2-1e92-46f0-b5c5-d9e318e57224
source_path: https://notes.granola.ai/d/4cce34f2-1e92-46f0-b5c5-d9e318e57224
ingested: 2026-07-14
topics_detected: [design-engineering-collaboration, communication, combat-system, cross-discipline, production-culture]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [production_methods, client_patterns]
new_bank_suggestions: []
sensitivity_class: anonymisable
extract_type: methodology
---

# Design-Engineering Direct Feedback Protocol: Evaluation vs Integration Communication Fix

## Key Content

A studio experienced a seventh combat system rebuild. Root cause diagnosis: designers had not explicitly told engineering what was wrong with the existing system. Instead, they requested a third-party plugin evaluation. Engineering interpreted this as a challenge to their work rather than a requirements gap -- producing defensiveness rather than an assessment. The gap was structural, not personal.

The agreed fix is a direct feedback protocol replacing siloed channel communication:

**Protocol:**
1. Designer finds something useful in a plugin or reference game: takes a screenshot, sends directly to the relevant engineer
2. Engineer responds: "good / bad / already built / backlog" -- a single-line answer is sufficient
3. Engineers treat designer requests as requirements statements, not challenges to existing code
4. Designers state pain points explicitly ("the current system cannot do X") rather than proxying through plugin requests ("evaluate this plugin")

**Root cause pattern (generalised):**
- Multiple rebuilds of a system make engineers protective of their work -- understandable but dysfunctional
- Designers requesting an evaluation without stating what the existing system lacks gives engineers no actionable signal
- The proxy request ("evaluate plugin X") is almost always a disguised statement of ("the existing system doesn't do X")
- Absent a direct communication path, the cycle repeats: designer finds workaround, engineer sees it as rejection, system gets rebuilt

**Channel discipline:**
- Engineering should not be excluded from design exploration channels where potential integration topics are discussed
- Cross-functional issues are resolved faster in an open channel than through separate siloed discussion then handover

## Decisions / Insights

- Studio CPO decided: direct designer-to-engineer communication (screenshot → immediate response) replaces siloed channel routing for plugin or system evaluation requests.
- Studio CPO identified: "evaluate this plugin" is almost always a proxy for "the existing system doesn't do X"; the fix is to require the explicit statement of the gap.
- Studio engineering lead acknowledged: treating a design evaluation request as a challenge to existing work is a defensive pattern that adds rebuild cycles; engineers must respond to design pain points as requirements.
- Studio design lead clarified: requesting an evaluation is not the same as requesting integration -- this distinction must be stated explicitly in the request.

## Context

ACF combat system evaluation meeting at a ~55-person MMO studio, 14 Jul 2026. The studio was experiencing its seventh combat system rebuild. The engineering lead had built approximately half of the requested plugin functionality already; designers were unaware. The communication fix was agreed in the meeting as a permanent protocol change.

## Applicability

Relevant when: a studio is experiencing repeated system rebuilds in the same area -- the diagnostic question is whether designers have explicitly stated what the existing system cannot do, or have proxied the request through a plugin or external reference.
Relevant when: a design team and engineering team are routing requests through separate channels -- cross-functional system discussions should happen in open channels with both disciplines present.
Relevant when: an engineering team is becoming defensive about an existing system -- the intervention is to explicitly separate "evaluate" from "replace" in all design requests, and to hold engineers to a "requirements" response rather than a code-defence response.
Relevant when: advising on studio communication structure for combat or systems design -- a screenshot-to-engineer direct feedback loop is a lightweight protocol that prevents multi-month misalignments from forming.
