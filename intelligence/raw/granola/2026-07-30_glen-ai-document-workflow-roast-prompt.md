---
source: granola
source_id: not_0x0pcAAIov0XGK
source_path: https://notes.granola.ai/d/2ef0b4f0-d445-42c5-b573-98c872ce1229
ingested: 2026-07-30
topics_detected: [ai-workflow, document-generation, prompt-engineering, tooling]
relevance_score: 8
novelty_score: 8
actionability_score: 9
bank_candidates: [personal_insights]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: methodology
---

# Glen's AI Document Generation Workflow: Brainstorm → Roast → Refine

## Key Content

Glen's personal workflow for producing high-quality game design and production documents using Claude:

**Step 1 -- brainstorm dump:** Themes and ideas captured in Notepad or via Windows Whisper dictation (voice-to-text). Rough, unstructured. The point is to externalise thinking, not to produce copy.

**Step 2 -- structured Claude prompt:** Brainstorm text pasted into a prompt that includes role-specific skills (game designer, game producer). Produces a structured first draft.

**Step 3 -- roast prompt:** A separate adversarial prompt instructs Claude to act as a senior game designer / MMO veteran and find everything wrong with the document. Forces honest critique from a credible domain perspective. This is the quality gate.

**Step 4 -- refinement prompt:** Makes the output cohesive and on-tone after incorporating roast feedback.

**Downstream pipeline envisioned:** Finished deck → Claude generates one-pager → script → interview guidance → founder video.

**Skill package shareable:** The roast prompt, refinement prompt, and role-specific skills (game designer, game producer) can be packaged and distributed to domain collaborators (e.g., Game Director) who want to replicate the same quality ramp.

## Decisions / Insights

- Glen concluded: the roast prompt step is the quality gate -- without adversarial critique from a credible persona, the output is competent but not stress-tested
- Glen confirmed: Windows Whisper dictation is a fast capture tool for early-stage thinking, equivalent to Notepad for structured input
- Glen decided: prompt package to be assembled and shared with the Game Director for independent use

## Context

Working session between Glen (CPO) and the studio's Game Director reviewing a game vision deck, July 2026. Glen described his document generation process unprompted when the Game Director asked about the document quality. Game Director requested the prompt package for personal use.

## Applicability

Relevant when: Glen is producing any structured document (deck, spec, framework) -- the brainstorm → roast → refine pipeline consistently produces higher-quality output than single-pass generation.
Relevant when: a collaborator asks how to produce Glen-quality documents using Claude -- share the prompt package (roast prompt + refinement prompt + role skills).
Relevant when: Glen is onboarding a collaborator to AI-assisted work -- the skill package approach (distributable prompt set per domain) is the right transfer mechanism.
