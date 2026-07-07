---
source: granola
source_id: b090af79-79bf-4f9c-bf42-f4b44ad3f7d2
source_path: https://notes.granola.ai/d/b090af79-79bf-4f9c-bf42-f4b44ad3f7d2
ingested: 2026-07-07
topics_detected: [ai-tooling, ai-policy, concept-art, engineering-ai, studio-policy]
relevance_score: 9
novelty_score: 8
actionability_score: 9
bank_candidates: [industry_current, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# AI Tooling Policy for Game Studios: Engineering vs. Art-Side Distinctions

## Key Content

Blanket "no AI" contract clauses are unworkable: Photoshop, Zoom, and IntelliSense all use AI. Any clause that bans AI wholesale bans the tools the team is already using.

**Engineering AI use:**
- Broadly supported; engineer remains accountable for knowing when the output is wrong
- Key risk: AI is "inherently lazy" -- it takes the most common path, which is rarely correct for MMO architecture
- Unreal + MMO constraints are underrepresented in LLM training data; models default to behaviour trees and single-threaded patterns, not scalable server architecture
- Specific, constrained prompting gets useful output; vague prompting produces generic (and often wrong) architecture suggestions
- Implication: engineers using AI on MMO server code need enough expertise to recognise when the suggestion is wrong

**Art-side AI:**
- More contentious; split between enthusiasts and refusers with no stable middle ground in most studios
- Pragmatic studio position: hire 1-2 concept artists to set visual thematics and QA AI-generated output rather than a full team
- Frame as runway preservation and output velocity, not headcount reduction
- Avoid AI on shipped front-end art where the quality bar is not yet met; use it in ideation and reference generation

**Policy framing:**
- Stance: bullish on AI as a tool; avoid it where quality bar is unmet
- Contract approach: specify AI restrictions narrowly (e.g. "no AI-generated assets in shipped art") not broadly

## Decisions / Insights

- Architect concluded: blanket AI bans in employment contracts are unenforceable and counterproductive; restrictions should be specific to shipped assets.
- Architect recommended: hire 1-2 concept artists to set style and QA AI output rather than a full concept team; frame as velocity, not cost-cutting.
- Architect identified: Unreal + MMO is underrepresented in AI training data; engineers must have sufficient expertise to recognise wrong suggestions before using AI on server architecture.
- Architect observed: art-side AI is a culture split in most studios; the pragmatic middle is focused, bounded use in ideation rather than shipped assets.

## Context

Technical interview with a candidate for a senior engineering role at a ~55-person MMO studio, 7 Jul 2026. AI tooling came up organically as part of a broader discussion about studio operating model and concept art team sizing. Candidate had observed the art-side/engineering split directly in prior studios.

## Applicability

- Relevant when: advising a studio on AI policy -- recommend specific, bounded restrictions rather than blanket bans; help them identify what "no AI" actually means in practice.
- Relevant when: a client is sizing their concept art team -- the 1-2 concept artists as style guardians + AI output QA model is a tested approach for studios under runway pressure.
- Relevant when: a studio is using AI for server or engine code on Unreal -- flag that MMO patterns are underrepresented in training data; quality of output depends heavily on how constrained the prompt is.
- Relevant when: contract negotiations include IP or AI clauses -- narrow the restriction to shipped deliverables, not tooling.
- Relevant when: a studio has a culture split on AI art -- the pragmatic resolution is bounded use in ideation, not a blanket position either way.
